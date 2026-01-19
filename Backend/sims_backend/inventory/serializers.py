from rest_framework import serializers
from .models import Item, Fuel, Vehicle, Tool, Material, IssuedItem, Employee
from django.db import transaction

# ----------------------------- ITEM SERIALIZER -----------------------------
class ItemSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    vehicle_display = serializers.SerializerMethodField(read_only=True)
    fuel_type_display = serializers.SerializerMethodField(read_only=True)

    plate_number = serializers.CharField(write_only=True, required=False)
    fuel_type = serializers.IntegerField(write_only=True, required=False)

    returnable = serializers.BooleanField(write_only=True, default=True)
    uses_fuel = serializers.BooleanField(write_only=True, default=False)
    tool_fuel_type = serializers.IntegerField(write_only=True, required=False)
    condition = serializers.CharField(write_only=True, default="New")

    class Meta:
        model = Item
        fields = "__all__"
        read_only_fields = ["quantity_in_stock", "vehicle_display", "requires_approval", "reorder_level"]

    def get_vehicle_display(self, obj):
        if hasattr(obj, "vehicle"):
            return f"{obj.name.capitalize()} ({obj.vehicle.plate_number})"
        return None

    def get_fuel_type_display(self, obj):
        fuel = None
        if obj.category == "vehicle" and hasattr(obj, "vehicle") and obj.vehicle.fuel_type:
            fuel = obj.vehicle.fuel_type
        elif obj.category == "tool" and hasattr(obj, "tool") and obj.tool.fuel_type:
            fuel = obj.tool.fuel_type

        if fuel:
            return {"id": fuel.item.id, "name": fuel.item.name, "unit": fuel.item.unit}
        return None

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))

        if category == "vehicle":
            if not attrs.get("plate_number") and not getattr(self.instance, "vehicle", None):
                raise serializers.ValidationError({"plate_number": "Vehicle must have a plate number."})
            if not attrs.get("fuel_type") and not (hasattr(self.instance, "vehicle") and self.instance.vehicle.fuel_type):
                raise serializers.ValidationError({"fuel_type": "Vehicle must have a fuel type."})

        if category == "tool":
            uses_fuel = attrs.get("uses_fuel", False)
            fuel = attrs.get("tool_fuel_type")
            if uses_fuel and not fuel:
                raise serializers.ValidationError({"tool_fuel_type": "Tool uses fuel, fuel type required."})
            if not uses_fuel and fuel:
                raise serializers.ValidationError({"tool_fuel_type": "Tool does not use fuel."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        plate_number = validated_data.pop("plate_number", None)
        fuel_item_id = validated_data.pop("fuel_type", None)

        returnable = validated_data.pop("returnable", True)
        uses_fuel = validated_data.pop("uses_fuel", False)
        tool_fuel_item_id = validated_data.pop("tool_fuel_type", None)
        condition = validated_data.pop("condition", "New")

        item = Item.objects.create(**validated_data)

        if item.category == "fuel":
            Fuel.objects.create(item=item)
        elif item.category == "vehicle":
            fuel = self._resolve_fuel(fuel_item_id)
            Vehicle.objects.create(item=item, plate_number=plate_number, fuel_type=fuel)
        elif item.category == "tool":
            fuel = self._resolve_fuel(tool_fuel_item_id) if uses_fuel else None
            Tool.objects.create(item=item, condition=condition, returnable=returnable, uses_fuel=uses_fuel, fuel_type=fuel)
        elif item.category == "material":
            Material.objects.create(item=item)

        return item

    def _resolve_fuel(self, fuel_item_id):
        try:
            fuel_item = Item.objects.get(id=fuel_item_id, category="fuel")
            return fuel_item.fuel
        except Item.DoesNotExist:
            raise serializers.ValidationError("Invalid fuel item selected.")
        except Fuel.DoesNotExist:
            raise serializers.ValidationError("Fuel item is not registered as fuel.")


# ----------------------------- ISSUED ITEM SERIALIZER -----------------------------
class IssuedItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    category_display = serializers.CharField(source="item.get_category_display", read_only=True)

    vehicle_plate = serializers.SerializerMethodField(read_only=True)
    vehicle_name = serializers.SerializerMethodField(read_only=True)
    previous_mileage = serializers.SerializerMethodField(read_only=True)
    distance_traveled = serializers.SerializerMethodField(read_only=True)
    temp_efficiency = serializers.SerializerMethodField(read_only=True)
    calculated_efficiency = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = IssuedItem
        fields = [
            'id', 'employee', 'item', 'issued_quantity', 'returned_quantity',
            'issue_date', 'expected_return_date', 'is_active', 'current_mileage',
            'item_name', 'employee_name', 'category_display', 'remaining_quantity',
            'vehicle_plate', 'vehicle_name', 'previous_mileage',
            'distance_traveled', 'temp_efficiency', 'calculated_efficiency', 'status'
        ]
        read_only_fields = ['returned_quantity', 'issue_date', 'is_active', 'remaining_quantity',
                            'temp_efficiency', 'calculated_efficiency']

    def _get_previous_issuance(self, obj):
        """Fetch the last issued fuel for this vehicle."""
        if not hasattr(obj, "_previous_issuance"):
            obj._previous_issuance = IssuedItem.objects.filter(
                vehicle=obj.vehicle,
                item__category='fuel',
                status='Issued'
            ).exclude(pk=obj.pk).order_by('-issue_date').first()
        return obj._previous_issuance

    def get_vehicle_plate(self, obj):
        return obj.vehicle.plate_number if obj.vehicle else None

    def get_vehicle_name(self, obj):
        return obj.vehicle.item.name if obj.vehicle else None

    def get_previous_mileage(self, obj):
        previous = self._get_previous_issuance(obj)
        return previous.current_mileage if previous else 0

    def get_distance_traveled(self, obj):
        prev_mileage = self.get_previous_mileage(obj)
        if obj.current_mileage is not None:
            return obj.current_mileage - prev_mileage
        return None

    def get_temp_efficiency(self, obj):
        """Efficiency calculated at request creation for MD/SM display."""
        previous = self._get_previous_issuance(obj)
        if previous and obj.current_mileage and previous.issued_quantity > 0:
            distance = obj.current_mileage - previous.current_mileage
            if distance > 0:
                return round(distance / float(previous.issued_quantity), 2)
        return None


# ----------------------------- EMPLOYEE SERIALIZER -----------------------------
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'name', 'department', 'email']


# ----------------------------- VEHICLE SERIALIZER -----------------------------
class VehicleSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    plate_number = serializers.CharField(read_only=True)
    fuel_type_name = serializers.CharField(source='fuel_type.item.name', read_only=True)
    fuel_efficiency = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    current_mileage = serializers.IntegerField(read_only=True)
    fuel_issuance_history = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'item_name', 'plate_number', 'fuel_type_name',
            'fuel_efficiency', 'current_mileage', 'fuel_issuance_history'
        ]

    def get_fuel_issuance_history(self, obj):
        history = []
        issuances = obj.fuel_issuances.filter(status='Issued').order_by('issue_date')
        for i, issuance in enumerate(issuances):
            efficiency = None
            if i > 0:
                previous = issuances[i-1]
                if previous.issued_quantity > 0 and issuance.current_mileage and previous.current_mileage:
                    distance = issuance.current_mileage - previous.current_mileage
                    if distance > 0:
                        efficiency = round(distance / float(previous.issued_quantity), 2)
            history.append({
                'id': issuance.id,
                'issue_date': issuance.issue_date,
                'fuel_litres': float(issuance.issued_quantity),
                'mileage': issuance.current_mileage,
                'efficiency_km_per_l': efficiency,
                'distance_from_previous': issuance.current_mileage - issuances[i-1].current_mileage if i > 0 else None
            })
        return history
