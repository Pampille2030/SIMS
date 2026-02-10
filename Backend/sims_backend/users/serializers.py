from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from .models import CustomUser


# ---------------------------------------------------------------------
# Standard User Serializer
# ---------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and representing CustomUser instances.
    Includes password hashing and role assignment.
    """

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        """
        Create a new user with hashed password and assigned role.
        """
        return CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role']
        )


# ---------------------------------------------------------------------
# Custom JWT Token Serializer
# Extends the default TokenObtainPairSerializer to include role info.
# ---------------------------------------------------------------------
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that adds role and username to the token payload.
    """

    @classmethod
    def get_token(cls, user):
        """
        Generate a JWT token and inject additional custom claims.
        """
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        return token

    def validate(self, attrs):
        """
        Validate user credentials and return a token response
        that includes role and username fields.
        """
        email = attrs.get('email')
        password = attrs.get('password')

        # Ensure required fields are provided
        if not email or not password:
            raise serializers.ValidationError("Email and password are required.")

        # Authenticate using email as the username field
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        # -----------------------------------------------------------------
        # ✅ Updated Role Validation:
        # Include all registered system roles including HRManager & LivestockManager
        # -----------------------------------------------------------------
        if user.role not in [
            'StoreManager',
            'ManagingDirector',
            'AccountsManager',
            'HumanResourceManager',
            'LivestockManager'   
        ]:
            raise serializers.ValidationError("Unauthorized role.")

        # Generate the token using the parent implementation
        data = super().validate(attrs)

        # Include additional data in response payload
        data['username'] = user.username
        data['role'] = user.role

        return data
