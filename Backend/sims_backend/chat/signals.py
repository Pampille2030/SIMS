# chat/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=Message)
def message_status_handler(sender, instance, created, **kwargs):
    if created:
        # Notify via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{instance.conversation.user2.id if instance.sender == instance.conversation.user1 else instance.conversation.user1.id}",
            {
                'type': 'chat_message',
                'message_id': str(instance.id),
                'text': instance.text,
                'sender_id': str(instance.sender.id),
                'sender_username': instance.sender.username,
                'conversation_id': str(instance.conversation.id),
                'sent_at': instance.sent_at.isoformat(),
                'is_read': instance.is_read
            }
        )