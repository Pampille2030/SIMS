# notifications_app/serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model
    """
    time_ago = serializers.SerializerMethodField()  # Add a human-readable time field

    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'link', 'time_ago']
        read_only_fields = ['id', 'created_at']

    def get_time_ago(self, obj):
        """
        Return human-readable time difference (e.g., "5 minutes ago")
        """
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        now = timezone.now()
        if obj.created_at:
            return timesince(obj.created_at, now) + ' ago'
        return None