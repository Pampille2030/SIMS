# item_issuance/signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications_app.models import Notification
from .models import IssueRecord, IssueItem

User = get_user_model()
_previous_status = {}

@receiver(pre_save, sender=IssueRecord)
def store_previous_status(sender, instance, **kwargs):
    """Keep previous status before saving."""
    if instance.pk:
        try:
            old = IssueRecord.objects.get(pk=instance.pk)
            _previous_status[instance.pk] = old.status
        except IssueRecord.DoesNotExist:
            _previous_status[instance.pk] = None

@receiver(post_save, sender=IssueRecord)
def issue_out_notification(sender, instance, created, **kwargs):
    """Notify SM when IssueRecord is marked as 'Issued'."""
    if not created:
        prev_status = _previous_status.pop(instance.pk, None)
        if prev_status != "Issued" and instance.status == "Issued":
            # Compose message for each item
            for item_entry in instance.items.all():
                item = item_entry.item
                issued_qty = item_entry.quantity_issued
                unit = item_entry.unit or item.unit
                remaining = item.quantity_in_stock
                issued_to = str(instance.issued_to)  # Make sure Employee.__str__ returns full name

                message = (
                    f"Issue out update: {issued_qty} {unit} of {item.name} "
                    f"issued to {issued_to}, we have {remaining} {unit} remaining."
                )

                # Notify **Store Manager** who issued it
                Notification.objects.create(
                    user=instance.issued_by,
                    message=message
                )
