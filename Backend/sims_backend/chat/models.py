from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

class Conversation(models.Model):
    ROLE_CHOICES = (
        ('StoreManager', 'Store Manager'),
        ('AccountsManager', 'Accounts Manager'),
        ('ManagingDirector', 'Managing Director'),
    )

    user1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_user1'
    )
    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_user2'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user1', 'user2')
        ordering = ['-last_updated']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'

    def __str__(self):
        return f"Conversation between {self.user1.username} and {self.user2.username}"

    def clean(self):
        # Prevent users from chatting with themselves
        if self.user1 == self.user2:
            raise ValidationError("Users cannot have conversations with themselves")
        
        # Ensure proper role-based conversations
        if (self.user1.role == 'StoreManager' and 
            self.user2.role not in ['AccountsManager', 'ManagingDirector']):
            raise ValidationError("Store Managers can only chat with Accounts Managers or Managing Directors")
        
        # Add other role-based validation as needed

    def get_other_user(self, user):
        """Helper method to get the other participant in conversation"""
        return self.user2 if user == self.user1 else self.user1

    @classmethod
    def get_or_create_conversation(cls, user1, user2):
        """Safe method to get or create a conversation"""
        # Sort user IDs to ensure consistent conversation creation
        user1, user2 = sorted([user1, user2], key=lambda u: u.id)
        conversation, created = cls.objects.get_or_create(
            user1=user1,
            user2=user2
        )
        return conversation, created


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    text = models.TextField(max_length=2000)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    edited = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['sent_at']
        indexes = [
            models.Index(fields=['conversation', 'sent_at']),
            models.Index(fields=['sender', 'sent_at']),
        ]

    def __str__(self):
        return f"Message from {self.sender.username} at {self.sent_at}"

    def save(self, *args, **kwargs):
        # Update conversation's last_updated when new message is sent
        if not self.pk:  # Only on creation
            self.conversation.save()  # This will update last_updated
        super().save(*args, **kwargs)

    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])