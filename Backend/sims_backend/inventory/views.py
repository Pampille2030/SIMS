from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.db import transaction
from .models import Item, Fuel, Vehicle, Tool, Material, IssuedItem, Employee, ReturnedItem
from .serializers import ItemSerializer, IssuedItemSerializer, EmployeeSerializer, VehicleSerializer


# ==========================================================
#                       ITEM VIEWSET
# ==========================================================
class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Item.objects.all().select_related(
            "tool__fuel_type__item", "vehicle__fuel_type__item"
        ).order_by("name")
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    # ------------------- RESTOCK ITEM -------------------
    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        item = self.get_object()
        quantity_to_add = request.data.get("quantity_to_add")

        try:
            quantity_to_add = float(quantity_to_add)
        except (TypeError, ValueError):
            return Response({"error": "Valid quantity_to_add is required"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity_to_add <= 0:
            return Response({"error": "Quantity must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)
        if item.category == "vehicle":
            return Response({"error": "Cannot restock vehicles"}, status=status.HTTP_400_BAD_REQUEST)

        item.quantity_in_stock += quantity_to_add
        item.save()
        return Response({"message": f"{quantity_to_add} units added to {item.name}.", "new_stock": item.quantity_in_stock})

    # ------------------- RETRIEVE -------------------
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        if instance.category == "tool" and hasattr(instance, "tool"):
            tool = instance.tool
            data.update({
                "uses_fuel": tool.uses_fuel,
                "returnable": tool.returnable,
                "condition": tool.condition,
                "fuel_type": {
                    "id": tool.fuel_type.id,
                    "name": tool.fuel_type.item.name,
                    "unit": tool.fuel_type.item.unit,
                } if tool.uses_fuel and tool.fuel_type else None,
            })

        if instance.category == "vehicle" and hasattr(instance, "vehicle"):
            vehicle = instance.vehicle
            data.update({
                "vehicle_display": f"{instance.name} ({vehicle.plate_number})",
                "plate_number": vehicle.plate_number,
                "fuel_type": {
                    "id": vehicle.fuel_type.id,
                    "name": vehicle.fuel_type.item.name,
                    "unit": vehicle.fuel_type.item.unit,
                } if vehicle.fuel_type else None,
                "fuel_efficiency": float(vehicle.fuel_efficiency or 0),
                "current_mileage": vehicle.current_mileage,
            })

        return Response(data)

    # ------------------- LIST -------------------
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        items = self.get_queryset()

        # TOOL MAP
        tool_map = {
            t.item_id: {
                "uses_fuel": t.uses_fuel,
                "returnable": t.returnable,
                "condition": t.condition,
                "fuel_type": {
                    "id": t.fuel_type.id,
                    "name": t.fuel_type.item.name,
                    "unit": t.fuel_type.item.unit,
                } if t.uses_fuel and t.fuel_type else None
            } for t in Tool.objects.select_related("fuel_type__item")
        }

        # VEHICLE MAP
        vehicle_map = {
            v.item_id: {
                "vehicle_display": f"{v.item.name} ({v.plate_number})",
                "plate_number": v.plate_number,
                "fuel_type": {
                    "id": v.fuel_type.id,
                    "name": v.fuel_type.item.name,
                    "unit": v.fuel_type.item.unit,
                } if v.fuel_type else None,
                "fuel_efficiency": float(v.fuel_efficiency or 0),
                "current_mileage": v.current_mileage,
            } for v in Vehicle.objects.select_related("fuel_type__item")
        }

        for item_data in response.data:
            if item_data["category"] == "tool" and item_data["id"] in tool_map:
                item_data.update(tool_map[item_data["id"]])
            if item_data["category"] == "vehicle" and item_data["id"] in vehicle_map:
                item_data.update(vehicle_map[item_data["id"]])

        return response


# ==========================================================
#                 CATEGORY LIST VIEW
# ==========================================================
class CategoryListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        categories = [{"key": k, "value": v, "requires_approval": k != "tool"} for k, v in Item.CATEGORY_CHOICES]
        return Response(categories)


# ==========================================================
#                  FUEL TYPES VIEW
# ==========================================================
class FuelTypesView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        fuels = Fuel.objects.select_related("item").all()
        return Response([
            {
                "id": f.id,
                "name": f.item.name,
                "unit": f.item.unit,
                "current_stock": float(f.item.quantity_in_stock),
                "reorder_level": float(f.item.reorder_level),
            } for f in fuels
        ])


# ==========================================================
#                ISSUED ITEM VIEWSET
# ==========================================================
class IssuedItemViewSet(viewsets.ModelViewSet):
    serializer_class = IssuedItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = IssuedItem.objects.select_related("employee", "item", "vehicle").order_by("-issue_date")
        employee_id = self.request.query_params.get("employee")
        item_id = self.request.query_params.get("item")
        is_active = self.request.query_params.get("is_active")
        vehicle_id = self.request.query_params.get("vehicle")

        if employee_id: qs = qs.filter(employee_id=employee_id)
        if item_id: qs = qs.filter(item_id=item_id)
        if is_active is not None: qs = qs.filter(is_active=is_active.lower() == "true")
        if vehicle_id: qs = qs.filter(vehicle_id=vehicle_id)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        item = validated_data["item"]
        vehicle_id = request.data.get("vehicle")
        current_mileage = request.data.get("current_mileage")

        if item.category == "fuel":
            if not vehicle_id:
                return Response({"error": "Vehicle is required for fuel issuance"}, status=status.HTTP_400_BAD_REQUEST)
            if not current_mileage:
                return Response({"error": "Current mileage is required for vehicle fuel issuance"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            issued_item = serializer.save()

            if item.category == "fuel" and vehicle_id:
                try:
                    vehicle = Vehicle.objects.select_for_update().get(id=vehicle_id)
                    vehicle.current_mileage = current_mileage
                    efficiency = vehicle.calculate_fuel_efficiency(issued_item)
                    if efficiency is not None: vehicle.fuel_efficiency = efficiency
                    vehicle.save()
                    issued_item.vehicle = vehicle
                    issued_item.save()
                except Vehicle.DoesNotExist:
                    return Response({"error": f"Vehicle {vehicle_id} does not exist"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(issued_item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def return_item(self, request, pk=None):
        issued_item = self.get_object()
        returned_quantity = request.data.get("returned_quantity")
        condition = request.data.get("condition", "Good")

        try:
            returned_quantity = float(returned_quantity)
        except (TypeError, ValueError):
            return Response({"error": "Valid returned_quantity is required"}, status=status.HTTP_400_BAD_REQUEST)

        if returned_quantity <= 0:
            return Response({"error": "Returned quantity must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)
        if returned_quantity > issued_item.remaining_quantity:
            return Response({"error": f"Cannot return more than remaining quantity ({issued_item.remaining_quantity})"}, status=status.HTTP_400_BAD_REQUEST)

        ReturnedItem.objects.create(
            employee=issued_item.employee,
            issued_item=issued_item,
            condition=condition,
            returned_quantity=returned_quantity
        )

        return Response({"message": f"{returned_quantity} units returned successfully", "remaining_quantity": float(issued_item.remaining_quantity), "is_active": issued_item.is_active})

    @action(detail=False, methods=["get"])
    def vehicle_fuel(self, request):
        records = IssuedItem.objects.filter(item__category="fuel", vehicle__isnull=False).select_related("employee", "item", "vehicle").order_by("-issue_date")
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)


# ==========================================================
#                    EMPLOYEE VIEWSET
# ==========================================================
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


# ==========================================================
#                    VEHICLE VIEWSET
# ==========================================================
class VehicleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Vehicle.objects.select_related("item", "fuel_type__item").all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=["get"])
    def efficiency(self, request, pk=None):
        vehicle = self.get_object()
        fuel_issuances = IssuedItem.objects.filter(vehicle=vehicle, item__category="fuel").order_by("issue_date")

        efficiency_history = []
        total_distance, total_fuel = 0, 0

        for i, issuance in enumerate(fuel_issuances):
            entry = {"issue_date": issuance.issue_date, "fuel_litres": float(issuance.issued_quantity), "mileage": issuance.current_mileage}
            if i > 0:
                prev = fuel_issuances[i-1]
                if prev.issued_quantity > 0 and issuance.current_mileage and prev.current_mileage:
                    distance = issuance.current_mileage - prev.current_mileage
                    eff = distance / float(prev.issued_quantity)
                    entry.update({"distance_traveled": distance, "fuel_efficiency": round(eff,2), "previous_mileage": prev.current_mileage, "previous_fuel_litres": float(prev.issued_quantity)})
                    total_distance += distance
                    total_fuel += float(prev.issued_quantity)
            efficiency_history.append(entry)

        overall_efficiency = round(total_distance / total_fuel, 2) if total_fuel > 0 else 0
        return Response({
            "vehicle": vehicle.item.name,
            "plate_number": vehicle.plate_number,
            "fuel_type": vehicle.fuel_type.item.name if vehicle.fuel_type else None,
            "current_mileage": vehicle.current_mileage,
            "current_fuel_efficiency": float(vehicle.fuel_efficiency or 0),
            "overall_efficiency": overall_efficiency,
            "total_distance_traveled": total_distance,
            "total_fuel_consumed": total_fuel,
            "formula_explanation": "fuel_efficiency = (current_mileage - previous_mileage) / previous_issued_fuel",
            "efficiency_history": efficiency_history
        })


# ==========================================================
#                   ACTIVE ISSUES VIEW
# ==========================================================
class ActiveIssuesView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        active_issues = IssuedItem.objects.filter(is_active=True).select_related("employee", "item", "vehicle")
        serializer = IssuedItemSerializer(active_issues, many=True)
        return Response(serializer.data)
