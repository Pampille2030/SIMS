# reports/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Report
from purchase_order.models import PurchaseOrder
from item_issuance.models import IssueRecord
from stockin.models import StockIn


@receiver(post_save, sender=PurchaseOrder)
def log_purchase_order(sender, instance, created, **kwargs):
    if created:
        Report.objects.create(
            report_type="purchase_order",
            purchase_order=instance,
            created_by=getattr(instance, "created_by", None)
        )


@receiver(post_save, sender=IssueRecord)
def log_issue_out(sender, instance, created, **kwargs):
    if created:
        Report.objects.create(
            report_type="issue_out",
            issue_record=instance,
            created_by=getattr(instance, "created_by", None)
        )


@receiver(post_save, sender=StockIn)
def log_stock_in(sender, instance, created, **kwargs):
    if created:
        Report.objects.create(
            report_type="stock_in",
            stock_in=instance,
            created_by=getattr(instance, "created_by", None)
        )
