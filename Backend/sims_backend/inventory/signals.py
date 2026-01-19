# inventory/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications_app.models import Notification
from .models import Item

User = get_user_model()

@receiver(post_save, sender=Item)
def new_item_notification(sender, instance, created, **kwargs):
    if created:
        # Only notify MD and Store Manager
        recipients = User.objects.filter(role__in=["ManagingDirector", "StoreManager"])
        
        for user in recipients:
            Notification.objects.create(
                user=user,
                message=f"New item update: {instance.name.capitalize()}, quantity {instance.quantity_in_stock} {instance.unit} has been added since it wasn't in the system."
            )
