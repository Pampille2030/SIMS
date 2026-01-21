from django.db import models
from django.utils import timezone
from inventory.models import Item
from employees.models import Employee


class PORequest(models.Model):

    APPROVAL_STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    # -------------------------
    # Request Info
    # -------------------------
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="po_requests"
    )

    requested_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Quantity requested to be purchased"
    )

    # Snapshot only (NO effect on stock)
    quantity_in_stock = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Stock level at time of request"
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="po_requests"
    )

    remarks = models.TextField(blank=True, null=True)

    # -------------------------
    # Approval
    # -------------------------
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default="PENDING"
    )

    approval_comment = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)

    # -------------------------
    # Audit
    # -------------------------
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def approve(self):
        self.approval_status = "APPROVED"
        self.approved_at = timezone.now()
        self.save(update_fields=["approval_status", "approved_at"])

    def reject(self):
        self.approval_status = "REJECTED"
        self.approved_at = timezone.now()
        self.save(update_fields=["approval_status", "approved_at"])

    def __str__(self):
        return f"{self.item.name} → {self.requested_quantity} ({self.approval_status})"
