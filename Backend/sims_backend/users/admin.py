# users/admin.py
from django.contrib import admin
from .models import (
    CustomUser,
    StoreManager,
    ManagingDirector,
    AccountsManager,
    HumanResourceManager  # ✅ Import HR Manager
)

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active')
    list_filter = ('role',)
    search_fields = ('username', 'email')
    ordering = ('username',)

@admin.register(StoreManager)
class StoreManagerAdmin(admin.ModelAdmin):
    list_display = ('username', 'email')
    search_fields = ('username', 'email')
    ordering = ('username',)

@admin.register(ManagingDirector)
class ManagingDirectorAdmin(admin.ModelAdmin):
    list_display = ('username', 'email')
    search_fields = ('username', 'email')
    ordering = ('username',)

@admin.register(AccountsManager)
class AccountsManagerAdmin(admin.ModelAdmin):
    list_display = ('username', 'email')
    search_fields = ('username', 'email')
    ordering = ('username',)

# ✅ NEW: HR Manager Admin Section
@admin.register(HumanResourceManager)
class HumanResourceManagerAdmin(admin.ModelAdmin):
    list_display = ('username', 'email')
    search_fields = ('username', 'email')
    ordering = ('username',)
