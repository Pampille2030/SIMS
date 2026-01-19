# users/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from .serializers import UserSerializer, CustomTokenObtainPairSerializer

User = get_user_model()

# ------------------------------------------------------------
# USER REGISTRATION
# ------------------------------------------------------------
# Handles new user account creation.
# Validates input via UserSerializer and saves user instance.
# ------------------------------------------------------------
class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'User registered successfully'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ------------------------------------------------------------
# USER LOGIN (JWT AUTHENTICATION)
# ------------------------------------------------------------
# Custom JWT token obtain view that includes role and user info
# using CustomTokenObtainPairSerializer.
# ------------------------------------------------------------
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ------------------------------------------------------------
# GET CURRENT USER (FULL PROFILE)
# ------------------------------------------------------------
# Returns detailed user info for authenticated users.
# Commonly used for dashboards or profile pages.
# ------------------------------------------------------------
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ------------------------------------------------------------
# GET MINIMAL USER INFO
# ------------------------------------------------------------
# Returns basic user data (username, email, role).
# Useful for frontend access control and quick role checks.
# ------------------------------------------------------------
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }, status=status.HTTP_200_OK)


# ------------------------------------------------------------
# CHANGE PASSWORD (AUTHENTICATED USERS)
# ------------------------------------------------------------
# Allows logged-in users to securely change their password.
# - Validates current password
# - Validates new password via Django validators
# - Ensures password confirmation matches
# ------------------------------------------------------------
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        old_password = data.get("old_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        # Validate current password
        if not user.check_password(old_password):
            return Response(
                {"detail": "Old password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate password confirmation
        if new_password != confirm_password:
            return Response(
                {"detail": "New passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply Django’s built-in password strength validators
        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response(
                {"detail": list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save new password
        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK
        )


# ------------------------------------------------------------
# FORGOT PASSWORD (EMAIL RESET LINK)
# ------------------------------------------------------------
# Handles sending password reset link to the user's email.
# Uses Django’s default token generator and send_mail utility.
# The frontend should handle the actual reset form.
# ------------------------------------------------------------
class ForgotPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user exists for given email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User with this email does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate unique reset token and UID
        token = default_token_generator.make_token(user)
        uid = user.pk

        # Construct password reset URL for frontend
        reset_url = f"http://localhost:3000/reset-password/{uid}/{token}/"
        # TODO: Update reset_url to match production frontend domain.

        # Send password reset email
        send_mail(
            subject="Password Reset Request",
            message=f"Click the link below to reset your password:\n{reset_url}",
            from_email=None,  # TODO: Update if using a real sender email
            recipient_list=[email],
            fail_silently=False,
        )

        return Response(
            {"message": "Password reset link has been sent."},
            status=status.HTTP_200_OK
        )
