# purchase_orders/signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications_app.models import Notification
from .models import PurchaseOrder

User = get_user_model()

# Store previous delivery status
_previous_delivery_status = {}

@receiver(pre_save, sender=PurchaseOrder)
def store_previous_delivery_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = PurchaseOrder.objects.get(pk=instance.pk)
            _previous_delivery_status[instance.pk] = old.delivery_status
        except PurchaseOrder.DoesNotExist:
            _previous_delivery_status[instance.pk] = None

@receiver(post_save, sender=PurchaseOrder)
def purchase_order_delivery_notification(sender, instance, created, **kwargs):
    if not created:
        prev_status = _previous_delivery_status.pop(instance.pk, None)

        # Only notify when delivery_status changes to 'delivered'
        if prev_status != "delivered" and instance.delivery_status == "delivered":
            recipients = User.objects.filter(role__in=["ManagingDirector", "StoreManager", "AccountsManager"])
            for user in recipients:
                Notification.objects.create(
                    user=user,
                    message=f"Purchase Order {instance.order_number} has been delivered to the store."
                )
