from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from inventory.models import Item, Vehicle
from employees.models import Employee
from item_issuance.models import IssueItem, IssueRecord

User = get_user_model()


# ---------------------------
# Vehicle Serializer
# ---------------------------
class VehicleSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.CharField(source="item.name", read_only=True)
    fuel_type_name = serializers.SerializerMethodField()
    fuel_type_item_id = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id", "vehicle_name", "plate_number",
            "fuel_type", "fuel_type_name", "fuel_type_item_id"
        ]
        read_only_fields = ["id", "fuel_type_name", "fuel_type_item_id"]

    def get_fuel_type_name(self, obj):
        return getattr(getattr(obj.fuel_type, 'item', None), 'name', None)

    def get_fuel_type_item_id(self, obj):
        return getattr(getattr(obj.fuel_type, 'item', None), 'id', None)


# ---------------------------
# Issue Item Serializer
# ---------------------------
class IssueItemSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(), source="item", write_only=True
    )
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_category = serializers.CharField(source="item.category", read_only=True)
    current_stock = serializers.DecimalField(
        source="item.quantity_in_stock", read_only=True, max_digits=10, decimal_places=2
    )
    unit = serializers.CharField(source="item.unit", read_only=True)
    returned_quantity = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    return_condition = serializers.CharField(max_length=100, required=False, allow_null=True)
    outstanding_quantity = serializers.SerializerMethodField()
    is_fully_returned = serializers.SerializerMethodField()

    # ------------------- Fuel tracking fields -------------------
    previous_odometer = serializers.FloatField(read_only=True)
    current_odometer = serializers.FloatField(required=False, allow_null=True)
    distance_travelled = serializers.FloatField(read_only=True)
    efficiency = serializers.SerializerMethodField()  # Changed to SerializerMethodField for better formatting
    # ------------------------------------------------------------

    class Meta:
        model = IssueItem
        fields = [
            "id", "item_id", "item_name", "item_category", "current_stock", "unit",
            "quantity_issued", "returned_quantity", "return_condition",
            "outstanding_quantity", "is_fully_returned",
            "previous_odometer", "current_odometer", "distance_travelled", "efficiency"
        ]
        read_only_fields = [
            "id", "returned_quantity", "outstanding_quantity", "is_fully_returned",
            "previous_odometer", "distance_travelled"
        ]

    def get_outstanding_quantity(self, obj):
        return obj.quantity_issued - obj.returned_quantity

    def get_is_fully_returned(self, obj):
        return obj.returned_quantity >= obj.quantity_issued

    def get_efficiency(self, obj):
        """Format efficiency for display - handles None values"""
        if obj.efficiency is not None:
            return round(obj.efficiency, 2)
        return None


# ---------------------------
# Return Item Serializer
# ---------------------------
class ReturnItemSerializer(serializers.Serializer):
    issue_item_id = serializers.PrimaryKeyRelatedField(queryset=IssueItem.objects.all())
    returned_quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    return_condition = serializers.CharField(max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        issue_item = data['issue_item_id']
        outstanding = issue_item.quantity_issued - issue_item.returned_quantity
        if data['returned_quantity'] > outstanding:
            raise serializers.ValidationError({
                'returned_quantity': f'Cannot return more than outstanding quantity ({outstanding})'
            })
        return data


# ---------------------------
# Issue Record Serializer
# ---------------------------
class IssueRecordSerializer(serializers.ModelSerializer):
    items = IssueItemSerializer(many=True)
    issue_id = serializers.CharField(read_only=True)
    issue_date = serializers.DateTimeField(read_only=True)
    actual_return_date = serializers.DateTimeField(read_only=True)

    issued_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    issued_by_name = serializers.SerializerMethodField()
    issued_to = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    issued_to_name = serializers.SerializerMethodField()
    approved_by = serializers.PrimaryKeyRelatedField(read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    status = serializers.CharField(default='Pending')
    approval_status = serializers.CharField(default='Pending')

    fuel_type = serializers.ChoiceField(
        choices=IssueRecord.FUEL_TYPES, required=False, allow_null=True
    )
    vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), required=False, allow_null=True
    )
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)
    vehicle_fuel_type = serializers.SerializerMethodField()

    class Meta:
        model = IssueRecord
        fields = "__all__"
        read_only_fields = (
            "approval_date", "approved_by", "actual_return_date", 
            "issue_id", "issue_date"
        )

    def get_issued_to_name(self, obj):
        if obj.issued_to:
            return f"{obj.issued_to.first_name} {obj.issued_to.last_name} ({obj.issued_to.job_number})"
        return "Unknown"

    def get_issued_by_name(self, obj):
        if obj.issued_by:
            return f"{obj.issued_by.first_name} {obj.issued_by.last_name}"
        return "Unknown"

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return None

    def get_vehicle_fuel_type(self, obj):
        return getattr(getattr(getattr(obj.vehicle, 'fuel_type', None), 'item', None), 'name', None)

    def validate(self, data):
        issue_type = data.get('issue_type')
        fuel_type = data.get('fuel_type')
        vehicle = data.get('vehicle')

        if issue_type == 'fuel' and not fuel_type:
            raise serializers.ValidationError({"fuel_type": "Fuel type must be specified"})
        if issue_type == 'fuel' and fuel_type == 'vehicle' and not vehicle:
            raise serializers.ValidationError({"vehicle": "Vehicle must be selected for vehicle fuel"})
        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        user = self.context.get("request").user if self.context.get("request") else None
        validated_data["issued_by"] = user

        with transaction.atomic():
            record = IssueRecord.objects.create(**validated_data)
            for item_data in items_data:
                IssueItem.objects.create(
                    issue_record=record,
                    item=item_data["item"],
                    quantity_issued=item_data["quantity_issued"],
                    current_odometer=item_data.get("current_odometer")
                )
        return record

    def to_representation(self, instance):
        """Ensure items are always included in the response"""
        representation = super().to_representation(instance)
        if 'items' not in representation or not representation['items']:
            representation['items'] = IssueItemSerializer(instance.items.all(), many=True).data
        return representation


# ---------------------------
# Issue Out Serializer
# ---------------------------
class IssueOutSerializer(serializers.Serializer):
    issued_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), default=serializers.CurrentUserDefault()
    )
    issue_date = serializers.DateTimeField(default=timezone.now)

    def validate(self, data):
        issue_record = self.context.get('issue_record')
        if not issue_record:
            raise serializers.ValidationError("Issue record not found in context")

        if issue_record.status not in ['Pending', 'Approved']:
            raise serializers.ValidationError(f"Cannot issue out. Current status: {issue_record.status}")

        errors = []
        for item in issue_record.items.all():
            if item.item.quantity_in_stock < item.quantity_issued:
                errors.append(f"Insufficient stock for {item.item.name}")

        if errors:
            raise serializers.ValidationError({"errors": errors})

        return data

    def create(self, validated_data):
        issue_record = self.context.get('issue_record')
        user = validated_data.get('issued_by')

        with transaction.atomic():
            for issue_item in issue_record.items.all():
                # Update stock
                issue_item.item.quantity_in_stock -= issue_item.quantity_issued
                issue_item.item.save()

                # ----------- Set previous odometer for fuel tracking ----------
                # Efficiency calculation is now handled by the model's save() method
                if issue_item.item.category == 'fuel' and issue_record.vehicle and issue_item.current_odometer is not None:
                    # Find the previous fuel issuance for this vehicle
                    last_fuel = IssueItem.objects.filter(
                        issue_record__vehicle=issue_record.vehicle,
                        item__category='fuel',
                        current_odometer__isnull=False
                    ).exclude(pk=issue_item.pk).order_by('-issue_record__issue_date').first()

                    if last_fuel and last_fuel.current_odometer is not None:
                        issue_item.previous_odometer = last_fuel.current_odometer
                        issue_item.distance_travelled = issue_item.current_odometer - last_fuel.current_odometer
                    else:
                        issue_item.previous_odometer = None
                        issue_item.distance_travelled = 0
                    
                    # Save will trigger the model's calculate_fuel_efficiency() method
                    issue_item.save()

            issue_record.status = 'Issued'
            issue_record.save()

        return {
            'issue_record': issue_record,
            'issued_by': user,
            'issue_date': validated_data.get('issue_date')
        }


# ---------------------------
# Cancel Issue Serializer
# ---------------------------
class CancelIssueSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        issue_record = self.context.get('issue_record')
        if not issue_record:
            raise serializers.ValidationError("Issue record not found in context")

        if issue_record.status in ["Issued", "Returned"]:
            raise serializers.ValidationError(
                f"Cannot cancel an issue with status '{issue_record.status}'"
            )
        if issue_record.status == "Cancelled":
            raise serializers.ValidationError("Issue is already cancelled")

        return data

    def save(self):
        issue_record = self.context.get('issue_record')
        reason = self.validated_data.get('reason', '')

        issue_record.status = "Cancelled"
        issue_record.cancelled_reason = reason
        issue_record.cancelled_date = timezone.now()
        issue_record.save()
        return issue_record


# ---------------------------
# Return Record Serializer
# ---------------------------

class ReturnRecordSerializer(serializers.Serializer):
    items_to_return = ReturnItemSerializer(many=True)
    return_date = serializers.DateTimeField(default=timezone.now)
    returned_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        default=serializers.CurrentUserDefault()
    )
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        items_data = validated_data.pop('items_to_return')
        return_date = validated_data.get('return_date')
        returned_by = validated_data.get('returned_by')

        updated_items = []

        with transaction.atomic():
            for item_data in items_data:
                issue_item = IssueItem.objects.select_for_update().get(
                    pk=item_data['issue_item_id'].pk
                )

                issue_item.returned_quantity += Decimal(
                    str(item_data['returned_quantity'])
                )
                issue_item.return_condition = item_data['return_condition']

                if item_data.get('notes'):
                    issue_item.notes = item_data['notes']

                issue_item.save()
                updated_items.append(issue_item)

        return {
            'returned_items': updated_items,
            'return_date': return_date
        }