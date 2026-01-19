from django.urls import path
from .views import (
    ConversationListView,
    CreateConversationView,
    MessageListCreateView,
    ManagerUserListView,
)

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:conversation_id>/messages/', MessageListCreateView.as_view(), name='conversation-messages'),
    path('start_or_get_conversation/', CreateConversationView.as_view(), name='start-conversation'),
    path('managers/', ManagerUserListView.as_view(), name='manager-users'),
]
