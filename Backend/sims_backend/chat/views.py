from rest_framework import generics, permissions, status
from rest_framework.response import Response
from users.models import CustomUser
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(user1=self.request.user) | Q(user2=self.request.user)
        ).distinct().order_by('-last_updated')

class CreateConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)

        if other_user.id == request.user.id:
            return Response({"error": "Cannot chat with yourself"}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Get role-based permissions
        current_role = request.user.role
        other_role = other_user.role
        
        # Define allowed role combinations
        allowed_combinations = {
            'StoreManager': ['AccountsManager', 'ManagingDirector'],
            'AccountsManager': ['StoreManager', 'ManagingDirector'],
            'ManagingDirector': ['StoreManager', 'AccountsManager']
        }

        if current_role not in allowed_combinations or other_role not in allowed_combinations[current_role]:
            return Response({"error": "Not allowed to chat with this user"}, 
                          status=status.HTTP_403_FORBIDDEN)

        # Get or create conversation
        user1, user2 = sorted([request.user, other_user], key=lambda u: u.id)
        conversation, created = Conversation.objects.get_or_create(
            user1=user1,
            user2=user2
        )

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MessageListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = Conversation.objects.filter(
            Q(id=conversation_id) &
            (Q(user1=request.user) | Q(user2=request.user))
        ).first()
        
        if not conversation:
            return Response({"error": "Conversation not found"}, 
                          status=status.HTTP_404_NOT_FOUND)

        # Mark messages as read
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        
        messages = conversation.messages.all().order_by("sent_at")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, conversation_id):
        conversation = Conversation.objects.filter(
            Q(id=conversation_id) &
            (Q(user1=request.user) | Q(user2=request.user))
        ).first()
        
        if not conversation:
            return Response({"error": "Conversation not found"}, 
                          status=status.HTTP_404_NOT_FOUND)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=request.data.get("text", "")
        )

        # Notify recipient
        recipient = conversation.user2 if conversation.user1 == request.user else conversation.user1
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            f"chat_{recipient.id}",
            {
                "type": "chat.message",
                "message_id": str(message.id),
                "text": message.text,
                "sender_id": str(request.user.id),
                "sender_username": request.user.username,
                "conversation_id": str(conversation.id),
                "sent_at": message.sent_at.isoformat(),
                "is_read": message.is_read
            }
        )

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ManagerUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_user = request.user
        role_choices = dict(CustomUser.ROLE_CHOICES)
        
        # Define strict role-based visibility rules
        role_visibility = {
            'StoreManager': ['AccountsManager', 'ManagingDirector'],
            'AccountsManager': ['StoreManager', 'ManagingDirector'],
            'ManagingDirector': ['StoreManager', 'AccountsManager']
        }

        if current_user.role not in role_visibility:
            return Response(
                {"error": "Your role cannot initiate chats"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        managers = User.objects.filter(
            role__in=role_visibility[current_user.role],
            is_active=True
        ).exclude(id=current_user.id).order_by('username').values(
            'id', 'username', 'role', 'email'
        )
        
        # Add display names
        for manager in managers:
            manager['role_display'] = role_choices.get(manager['role'], manager['role'])
        
        return Response(managers)