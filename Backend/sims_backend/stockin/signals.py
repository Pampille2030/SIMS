# stockin/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications_app.models import Notification
from .models import StockIn

User = get_user_model()

@receiver(post_save, sender=StockIn)
def stockin_notification(sender, instance, created, **kwargs):
    if created:
        qty = instance.quantity
        item = instance.item
        unit = item.unit if item else ""
        item_name = item.name.capitalize() if item else "Unknown item"

        # ✅ Get the live balance from Item table
        current_balance = item.quantity_in_stock if item else None

        # ✅ Build message
        if current_balance is not None:
            message = (
                f"Stock update: {qty} {unit} of {item_name} added to stock. "
                f"Now we have {current_balance} {unit} of {item_name}."
            )
        else:
            message = f"Stock update: {qty} {unit} of {item_name} added to stock."

        # ✅ Send to MD, AM, and Store Manager
        recipients = User.objects.filter(
            role__in=["ManagingDirector", "AccountsManager", "StoreManager"]
        )

        for user in recipients:
            Notification.objects.create(
                user=user,
                message=message
            )
