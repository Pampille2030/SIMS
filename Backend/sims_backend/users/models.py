from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db.models import Q


# ==============================================================
# Custom User Model
# --------------------------------------------------------------
# Extends Django's AbstractUser to include a `role` field that
# defines user types such as Store Manager, Managing Director,
# Accounts Manager, Human Resource Manager, and Livestock Manager.
# ==============================================================
class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('StoreManager', 'Store Manager'),
        ('ManagingDirector', 'Managing Director'),
        ('AccountsManager', 'Accounts Manager'),
        ('HumanResourceManager', 'Human Resource Manager'),
        ('LivestockManager', 'Livestock Manager'),  # ✅ NEW ROLE
    ]
    
    email = models.EmailField(
        unique=True,
        error_messages={
            'unique': "A user with that email already exists."
        }
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        help_text="Determines user permissions and visibility"
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        constraints = [
            models.UniqueConstraint(
                fields=['username'],
                name='unique_username',
                violation_error_message="Username already exists."
            ),
            models.UniqueConstraint(
                fields=['email'],
                name='unique_email',
                violation_error_message="Email already exists."
            )
        ]
        ordering = ['email']

    # ----------------------------------------------------------
    # Custom validation logic before saving a user
    # ----------------------------------------------------------
    def clean(self):
        super().clean()

        # Normalize email and username
        self.email = self.email.lower().strip()
        self.username = self.username.strip()

        # Prevent "admin" usernames unless Managing Director
        if ('admin' in self.username.lower() or 'administrator' in self.username.lower()) and \
           self.role != 'ManagingDirector':
            raise ValidationError({
                'username': "Admin usernames must be Managing Directors"
            })

        # Prevent duplicate active users
        if self.is_active and CustomUser.objects.filter(
            Q(username=self.username) | Q(email=self.email),
            is_active=True
        ).exclude(id=self.id).exists():
            raise ValidationError({
                'username': "Active user with this username or email already exists"
            })

    # ----------------------------------------------------------
    # Save method to ensure clean() is always called
    # ----------------------------------------------------------
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def role_display(self):
        return dict(self.ROLE_CHOICES).get(self.role, self.role)


# ==============================================================
# Proxy Models (Used for grouping users in Django Admin)
# --------------------------------------------------------------
# These proxy classes ensure each role appears in its own section
# in Django Admin, while still sharing the same database table.
# ==============================================================

# Store Manager Proxy
class StoreManager(CustomUser):
    class Meta:
        proxy = True
        verbose_name = "Store Manager"
        verbose_name_plural = "Store Managers"

    def save(self, *args, **kwargs):
        self.role = 'StoreManager'
        super().save(*args, **kwargs)


# Managing Director Proxy
class ManagingDirector(CustomUser):
    class Meta:
        proxy = True
        verbose_name = "Managing Director"
        verbose_name_plural = "Managing Directors"

    def save(self, *args, **kwargs):
        self.role = 'ManagingDirector'
        super().save(*args, **kwargs)


# Accounts Manager Proxy
class AccountsManager(CustomUser):
    class Meta:
        proxy = True
        verbose_name = "Accounts Manager"
        verbose_name_plural = "Accounts Managers"

    def save(self, *args, **kwargs):
        self.role = 'AccountsManager'
        super().save(*args, **kwargs)


# Human Resource Manager Proxy
class HumanResourceManager(CustomUser):
    class Meta:
        proxy = True
        verbose_name = "Human Resource Manager"
        verbose_name_plural = "Human Resource Managers"

    def save(self, *args, **kwargs):
        self.role = 'HumanResourceManager'
        super().save(*args, **kwargs)


# ✅ Livestock Manager Proxy
class LivestockManager(CustomUser):
    class Meta:
        proxy = True
        verbose_name = "Livestock Manager"
        verbose_name_plural = "Livestock Managers"

    def save(self, *args, **kwargs):
        self.role = 'LivestockManager'
        super().save(*args, **kwargs)
