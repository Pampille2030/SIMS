# notifications_app/admin.py
from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at', 'user']
    search_fields = ['message', 'user__username']
    readonly_fields = ['created_at']
    list_per_page = 20