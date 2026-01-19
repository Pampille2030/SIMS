# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from .models import Conversation, Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'chat_{self.user_id}'

        # Get token from query string
        token = self.scope.get('query_string').decode().split('=')[1] if 'token' in self.scope.get('query_string', b'').decode() else None
        
        if token:
            try:
                access_token = AccessToken(token)
                user = await self.get_user(access_token['user_id'])
                if user.id != int(self.user_id):
                    await self.close()
                    return
                self.scope['user'] = user
            except Exception as e:
                await self.close()
                return
        else:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if data['type'] == 'chat_message':
                sender = await database_sync_to_async(User.objects.get)(id=data['sender_id'])
                recipient = await database_sync_to_async(User.objects.get)(id=data['recipient_id'])
                
                # Get or create conversation
                conversation = await database_sync_to_async(Conversation.objects.get)(
                    Q(id=data['conversation_id']) &
                    (Q(user1=sender, user2=recipient) | Q(user1=recipient, user2=sender))
                )
                
                # Create message
                message = await database_sync_to_async(Message.objects.create)(
                    conversation=conversation,
                    sender=sender,
                    text=data['message']
                )
                
                # Broadcast to recipient
                await self.channel_layer.group_send(
                    f"chat_{recipient.id}",
                    {
                        'type': 'chat_message',
                        'message_id': str(message.id),
                        'text': message.text,
                        'sender_id': str(sender.id),
                        'sender_username': sender.username,
                        'conversation_id': str(conversation.id),
                        'sent_at': message.sent_at.isoformat(),
                        'is_read': message.is_read
                    }
                )
                
                # Send confirmation to sender
                await self.send(json.dumps({
                    'status': 'delivered',
                    'message_id': str(message.id),
                    'sent_at': message.sent_at.isoformat()
                }))

        except Exception as e:
            await self.send(json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))