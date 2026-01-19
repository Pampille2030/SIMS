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
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=10)
    requires_approval = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.name = self.name.strip().lower().rstrip("s")
        if self.category != "vehicle":
            if Item.objects.exclude(pk=self.pk).filter(name=self.name, category=self.category).exists():
                raise ValidationError({"name": f"Item '{self.name}' already exists in category '{self.category}'."})

        if self.category == "vehicle":
            self.quantity_in_stock = 1
            self.quantity_to_add = None
            self.reorder_level = 0
        else:
            if self.quantity_to_add:
                self.quantity_in_stock += self.quantity_to_add
                self.quantity_to_add = None
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
    current_mileage = models.PositiveIntegerField(default=0)
    fuel_type = models.ForeignKey(Fuel, on_delete=models.PROTECT, related_name="vehicles", null=True, blank=True)
    fuel_efficiency = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

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

    def calculate_fuel_efficiency(self, new_issue):
        """
        Calculates efficiency only when fuel is issued.
        Efficiency = distance travelled / previous issued fuel
        """
        previous_issue = IssuedItem.objects.filter(
            vehicle=self,
            item__category='fuel',
            status='Issued'
        ).exclude(pk=new_issue.pk).order_by('-issue_date').first()

        if not previous_issue:
            return None  # First fuel issuance, cannot calculate efficiency

        previous_mileage = previous_issue.current_mileage or 0
        distance = new_issue.current_mileage - previous_mileage
        consumed_fuel = previous_issue.issued_quantity

        if distance > 0 and consumed_fuel > 0:
            return round(distance / consumed_fuel, 2)
        return None

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
    current_mileage = models.PositiveIntegerField(null=True, blank=True)
    calculated_efficiency = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Fuel Efficiency (km/L)")
    temp_efficiency = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Temp Efficiency (display)")

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
        if self.item.category == "fuel" and self.vehicle and self.current_mileage is not None:
            last_issuance = IssuedItem.objects.filter(
                vehicle=self.vehicle,
                current_mileage__isnull=False
            ).exclude(pk=self.pk).order_by('-issue_date').first()
            if last_issuance and self.current_mileage <= last_issuance.current_mileage:
                raise ValidationError(f"Current mileage ({self.current_mileage}) must be greater than previous ({last_issuance.current_mileage})")
            if self.current_mileage <= self.vehicle.current_mileage:
                raise ValidationError(f"Current mileage ({self.current_mileage}) must be greater than vehicle's current mileage ({self.vehicle.current_mileage})")

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        self.clean()

        # Calculate temp efficiency for display at creation/approval stage
        if self.item.category == "fuel" and self.vehicle and self.current_mileage:
            previous_issue = IssuedItem.objects.filter(
                vehicle=self.vehicle,
                item__category='fuel',
                status='Issued'
            ).exclude(pk=self.pk).order_by('-issue_date').first()
            if previous_issue:
                distance = self.current_mileage - (previous_issue.current_mileage or 0)
                if distance > 0 and previous_issue.issued_quantity > 0:
                    self.temp_efficiency = round(distance / previous_issue.issued_quantity, 2)

        if is_new:
            self.item.quantity_in_stock -= self.issued_quantity
            self.item.save()

        super().save(*args, **kwargs)

        # Only store efficiency permanently when actually ISSUED
        if self.item.category == "fuel" and self.vehicle and self.status == 'Issued' and self.current_mileage:
            previous_issue = IssuedItem.objects.filter(
                vehicle=self.vehicle,
                item__category='fuel',
                status='Issued'
            ).exclude(pk=self.pk).order_by('-issue_date').first()

            # Update vehicle mileage
            self.vehicle.current_mileage = self.current_mileage
            self.vehicle.save(update_fields=['current_mileage'])

            # Store efficiency permanently on previous fuel record
            if previous_issue:
                efficiency = (self.current_mileage - previous_issue.current_mileage) / float(previous_issue.issued_quantity)
                efficiency = round(efficiency, 2)
                previous_issue.calculated_efficiency = efficiency
                previous_issue.save(update_fields=['calculated_efficiency'])
                self.vehicle.fuel_efficiency = efficiency
                self.vehicle.save(update_fields=['fuel_efficiency'])

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
    previous_mileage = serializers.SerializerMethodField(read_only=True)
    fuel_efficiency = serializers.SerializerMethodField(read_only=True)
    distance_traveled = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IssuedItem
        fields = [
            'id', 'employee', 'item', 'issued_quantity', 'returned_quantity',
            'issue_date', 'expected_return_date', 'is_active', 'current_mileage',
            'item_name', 'employee_name', 'vehicle_plate', 'previous_mileage',
            'fuel_efficiency', 'distance_traveled', 'calculated_efficiency', 'temp_efficiency'
        ]
        read_only_fields = ['returned_quantity', 'issue_date', 'is_active', 'calculated_efficiency']

    def get_vehicle_plate(self, obj):
        return obj.vehicle.plate_number if obj.vehicle else None

    def get_previous_mileage(self, obj):
        if not obj.vehicle:
            return 0
        prev = IssuedItem.objects.filter(
            vehicle=obj.vehicle,
            item__category='fuel',
            status='Issued',
            current_mileage__isnull=False
        ).exclude(pk=obj.pk).order_by('-issue_date', '-id').first()
        return prev.current_mileage if prev else 0

    def get_distance_traveled(self, obj):
        prev_mileage = self.get_previous_mileage(obj)
        if obj.current_mileage is None:
            return None
        return max(obj.current_mileage - prev_mileage, 0)

    def get_fuel_efficiency(self, obj):
        if not obj.vehicle or obj.current_mileage is None:
            return None
        prev = IssuedItem.objects.filter(
            vehicle=obj.vehicle,
            item__category='fuel',
            status='Issued',
            current_mileage__isnull=False
        ).exclude(pk=obj.pk).order_by('-issue_date', '-id').first()
        if not prev or prev.issued_quantity <= 0:
            return None
        distance = obj.current_mileage - prev.current_mileage
        if distance <= 0:
            return None
        return round(distance / float(prev.issued_quantity), 2)

