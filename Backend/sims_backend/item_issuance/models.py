from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
import uuid
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class IssueRecord(models.Model):
    ISSUE_TYPES = [('material', 'Material'), ('tool', 'Tool'), ('fuel', 'Fuel')]
    STATUS_CHOICES = [
        ('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected'),
        ('Issued', 'Issued'), ('Cancelled', 'Cancelled'), ('Returned', 'Returned'),
        ('Partially_Returned', 'Partially Returned'),
    ]
    FUEL_TYPES = [('vehicle', 'Vehicle Fuel'), ('machine', 'Machine Fuel')]

    issue_id = models.CharField(max_length=100, unique=True, blank=True)
    issued_to = models.ForeignKey('employees.Employee', on_delete=models.PROTECT, related_name="issues_received")
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="issues_made")
    issue_date = models.DateTimeField(default=timezone.now)
    actual_return_date = models.DateTimeField(null=True, blank=True)

    reason = models.TextField(blank=True, null=True)
    issue_type = models.CharField(max_length=50, choices=ISSUE_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    fuel_type = models.CharField(max_length=20, choices=FUEL_TYPES, null=True, blank=True)

    approval_status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')], default='Pending')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_issues")
    approval_date = models.DateTimeField(null=True, blank=True)

    # Vehicle fuel tracking
    vehicle = models.ForeignKey('inventory.Vehicle', null=True, blank=True, on_delete=models.PROTECT)

    class Meta:
        ordering = ['-issue_date']

    def clean(self):
        """Validate vehicle and fuel rules."""
        if self.issue_type == 'fuel':
            if not self.fuel_type:
                raise ValidationError("Fuel type must be specified (vehicle or machine)")

            if self.fuel_type == 'vehicle':
                if not self.vehicle:
                    raise ValidationError("Vehicle must be selected for vehicle fuel")

        elif self.issue_type != 'fuel' and self.fuel_type:
            raise ValidationError("Fuel type should only be specified for fuel issues")

    def save(self, *args, **kwargs):
        """Auto-generate issue_id."""
        if not self.issue_id:
            self.issue_id = f"ISSUE-{uuid.uuid4().hex[:6].upper()}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Issue {self.issue_id} to {self.issued_to}"

    @property
    def is_vehicle_fuel(self):
        return self.issue_type == 'fuel' and self.fuel_type == 'vehicle'

    @property
    def is_machine_fuel(self):
        return self.issue_type == 'fuel' and self.fuel_type == 'machine'


class IssueItem(models.Model):
    issue_record = models.ForeignKey(IssueRecord, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey('inventory.Item', on_delete=models.PROTECT)
    quantity_issued = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50, blank=True, null=True)
    returned_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    return_condition = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-id']

    def save(self, *args, **kwargs):
        is_new = not self.pk

        # Track previous values
        if self.pk:
            previous = IssueItem.objects.get(pk=self.pk)
            self._previous_returned_quantity = previous.returned_quantity
            self._previous_status = previous.issue_record.status
        else:
            self._previous_returned_quantity = 0
            self._previous_status = None

        if not self.unit:
            self.unit = self.item.unit

        super().save(*args, **kwargs)

        # ----------------- Update stock and issue record -----------------
        if is_new:
            if self.issue_record.issue_type == 'tool' and self.item.category != 'fuel':
                self.issue_record.approval_status = 'Approved'
                self.issue_record.status = 'Issued'
                self.issue_record.save()
                self.item.quantity_in_stock -= self.quantity_issued
                self.item.save()
            elif self.item.category == 'fuel':
                self.issue_record.fuel_litres = self.quantity_issued
                self.issue_record.save()
        else:
            if self.issue_record.status == 'Issued' and self._previous_status != 'Issued':
                self.item.quantity_in_stock -= self.quantity_issued
                self.item.save()

        # ----------------- Handle returned items -----------------
        if self.returned_quantity > self._previous_returned_quantity:
            quantity_to_restore = self.returned_quantity - self._previous_returned_quantity
            self.item.quantity_in_stock += quantity_to_restore
            self.item.save()