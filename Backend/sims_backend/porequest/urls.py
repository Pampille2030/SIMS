from django.urls import path
from .views import (
    PORequestCreateView,
    PORequestListView,
    MDPORequestListView,
    MDPORequestApprovalView,
)

urlpatterns = [
    # Store Manager
    path("create/", PORequestCreateView.as_view(), name="po-request-create"),
    path("list/", PORequestListView.as_view(), name="po-request-list"),

    # Managing Director
    path("md/list/", MDPORequestListView.as_view(), name="md-po-request-list"),
    path(
        "md/approve/<int:pk>/",
        MDPORequestApprovalView.as_view(),
        name="md-po-request-approve",
    ),
]
