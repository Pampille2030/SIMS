# users/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CurrentUserView,
    ChangePasswordView,
    ForgotPasswordView,
)

# ------------------------------------------------------------
# URL Configuration for User Authentication and Management
# ------------------------------------------------------------
# This module defines all user-related API endpoints including:
# - User registration
# - JWT authentication (login & refresh)
# - User profile retrieval
# - Password management (change & forgot password)
# ------------------------------------------------------------

urlpatterns = [
    # User Registration
    path('register/', RegisterView.as_view(), name='register'),

    # JWT Login (Custom token obtain pair)
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # JWT Token Refresh
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Retrieve currently authenticated user
    path('me/', CurrentUserView.as_view(), name='current_user'),

    # Change password for authenticated user
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Forgot password (reset via email or OTP)
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
]
