from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
import logging
from rest_framework import serializers
from django.db import transaction

logger = logging.getLogger(__name__)

# ----------------------------- MODELS -----------------------------

class Item(models.Model):
    CATEGORY_CHOICES = [
        ("fuel", "Fuel"),
        ("vehicle", "Vehicle"),
        ("tool", "Tool"),
        ("material", "Material"),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    unit = models.CharField(max_length=20, blank=True, null=True)
    quantity_in_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0, editable=False)
    quantity_to_add = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # <-- optional now
    requires_approval = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Normalize name
        self.name = self.name.strip().lower().rstrip("s")

        # Prevent duplicates for non-vehicle items
        if self.category != "vehicle":
            if Item.objects.exclude(pk=self.pk).filter(name=self.name, category=self.category).exists():
                raise ValidationError({"name": f"Item '{self.name}' already exists in category '{self.category}'."})

        # Special handling for vehicles
        if self.category == "vehicle":
            self.quantity_in_stock = 1
            self.quantity_to_add = None
            self.reorder_level = 0  # vehicles always have 0 reorder_level
        else:
            # Add new quantity if provided
            if self.quantity_to_add:
                self.quantity_in_stock += self.quantity_to_add
                self.quantity_to_add = None

            # Keep reorder_level as None if not provided
            if self.reorder_level is None:
                self.reorder_level = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name.capitalize()} ({self.category})"


class Fuel(models.Model):
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name="fuel")

    def clean(self):
        if self.item.category != "fuel":
            raise ValidationError("Linked item must be a fuel category.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.name}"


class Vehicle(models.Model):
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name="vehicle")
    plate_number = models.CharField(max_length=20, unique=True)
    fuel_type = models.ForeignKey(Fuel, on_delete=models.PROTECT, related_name="vehicles", null=True, blank=True)

    def clean(self):
        if self.item.category != "vehicle":
            raise ValidationError("Linked item must be a vehicle category.")
        if self.item.quantity_in_stock != 1:
            self.item.quantity_in_stock = 1
            self.item.save()
        if not self.fuel_type:
            raise ValidationError("Vehicle must have a fuel type.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.name} ({self.plate_number})"


class Tool(models.Model):
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name="tool")
    condition = models.CharField(max_length=50)
    returnable = models.BooleanField(default=True)
    uses_fuel = models.BooleanField(default=False)
    fuel_type = models.ForeignKey(Fuel, on_delete=models.SET_NULL, blank=True, null=True, related_name="tools_using_this_fuel")

    def clean(self):
        if self.item.category != "tool":
            raise ValidationError("Linked item must be a tool category.")
        if self.uses_fuel and not self.fuel_type:
            raise ValidationError("Fuel type required for fuel-using tools.")
        if not self.uses_fuel and self.fuel_type:
            raise ValidationError("Remove fuel type for non-fuel tools.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.uses_fuel:
            return f"{self.item.name} - {self.condition} (Uses {self.fuel_type.item.name if self.fuel_type else 'fuel'})"
        return f"{self.item.name} - {self.condition}"


class Material(models.Model):
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name="material")

    def clean(self):
        if self.item.category != "material":
            raise ValidationError("Linked item must be a material category.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.item.name


class Employee(models.Model):
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.name


class IssuedItem(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Issued', 'Issued'),
        ('Cancelled', 'Cancelled'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name="fuel_issuances")
    issued_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    returned_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    issue_date = models.DateTimeField(auto_now_add=True)
    expected_return_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')

    class Meta:
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['vehicle', 'issue_date']),
            models.Index(fields=['item', 'status']),
        ]

    @property
    def remaining_quantity(self):
        return self.issued_quantity - self.returned_quantity

    def clean(self):
        if self.issued_quantity > self.item.quantity_in_stock:
            raise ValidationError(f"Insufficient stock. Available: {self.item.quantity_in_stock}")

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        self.clean()

        if is_new:
            self.item.quantity_in_stock -= self.issued_quantity
            self.item.save()

        super().save(*args, **kwargs)

    def __str__(self):
        vehicle_info = f" for {self.vehicle.plate_number}" if self.vehicle else ""
        return f"{self.item.name}{vehicle_info} issued to {self.employee.name}"


class ReturnedItem(models.Model):
    CONDITION_CHOICES = [("Good", "Good"), ("Damaged", "Damaged")]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    issued_item = models.ForeignKey(IssuedItem, on_delete=models.CASCADE)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    returned_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    return_date = models.DateField(auto_now_add=True)

    def clean(self):
        if self.returned_quantity > self.issued_item.remaining_quantity:
            raise ValidationError(f"Cannot return more than remaining quantity ({self.issued_item.remaining_quantity})")

    def save(self, *args, **kwargs):
        self.clean()
        self.issued_item.returned_quantity += self.returned_quantity
        self.issued_item.save()
        self.issued_item.item.quantity_in_stock += self.returned_quantity
        self.issued_item.item.save()
        if self.issued_item.remaining_quantity <= 0:
            self.issued_item.is_active = False
            self.issued_item.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.issued_item.item.name} returned by {self.employee.name}"


# ----------------------------- SERIALIZERS -----------------------------

class IssuedItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    vehicle_plate = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IssuedItem
        fields = [
            'id', 'employee', 'item', 'issued_quantity', 'returned_quantity',
            'issue_date', 'expected_return_date', 'is_active',
            'item_name', 'employee_name', 'vehicle_plate'
        ]
        read_only_fields = ['returned_quantity', 'issue_date', 'is_active']

    def get_vehicle_plate(self, obj):
        return obj.vehicle.plate_number if obj.vehicle else None