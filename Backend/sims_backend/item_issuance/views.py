from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from django.utils import timezone
from django.db import transaction, models
from django.db.models import F
from decimal import Decimal

from item_issuance.models import IssueItem, IssueRecord
from item_issuance.serializers import (
    IssueRecordSerializer,
    ReturnRecordSerializer,
    IssueOutSerializer,
    VehicleSerializer,
    CancelIssueSerializer,  
)

from inventory.models import Vehicle, Item
from reports.models import Report


# =============================================================
# ISSUE RECORD VIEWSET
# =============================================================
class IssueRecordViewSet(viewsets.ModelViewSet):
    queryset = IssueRecord.objects.all()
    serializer_class = IssueRecordSerializer
    permission_classes = [IsAuthenticated]

    # --------------------------
    # CANCEL ISSUE
    # --------------------------
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        issue_record = self.get_object()
        serializer = CancelIssueSerializer(
            data=request.data, context={'issue_record': issue_record}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            "status": "Cancelled",
            "issue_id": issue_record.issue_id,
            "cancelled_reason": request.data.get("reason", "")
        }, status=status.HTTP_200_OK)

    # --------------------------
    # APPROVE ISSUE
    # --------------------------
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        issue = self.get_object()
        if issue.approval_status == "Approved":
            return Response({"detail": "Issue already approved"}, status=status.HTTP_400_BAD_REQUEST)
        if issue.approval_status == "Rejected":
            return Response({"detail": "Cannot approve a rejected issue"}, status=status.HTTP_400_BAD_REQUEST)

        issue.approval_status = "Approved"
        issue.approved_by = request.user
        issue.approval_date = timezone.now()
        issue.save()

        return Response({
            "detail": f"Issue {issue.issue_id} approved successfully",
            "approval_status": issue.approval_status,
            "status": issue.status
        }, status=status.HTTP_200_OK)

    # --------------------------
    # REJECT ISSUE
    # --------------------------
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        issue = self.get_object()
        if issue.approval_status == "Rejected":
            return Response({"detail": "Issue already rejected"}, status=status.HTTP_400_BAD_REQUEST)
        if issue.approval_status == "Approved":
            return Response({"detail": "Cannot reject an approved issue"}, status=status.HTTP_400_BAD_REQUEST)

        issue.approval_status = "Rejected"
        issue.status = "Cancelled"
        issue.approved_by = request.user
        issue.approval_date = timezone.now()
        issue.save()

        return Response({
            "detail": f"Issue {issue.issue_id} rejected successfully",
            "approval_status": issue.approval_status,
            "status": issue.status
        }, status=status.HTTP_200_OK)

    # --------------------------
    # GET QUERYSET WITH FILTERS
    # --------------------------
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        issue_type = params.get("issue_type")
        fuel_type = params.get("fuel_type")
        vehicle_id = params.get("vehicle")
        status_param = params.get("status")
        approval_status = params.get("approval_status")

        if issue_type:
            queryset = queryset.filter(issue_type=issue_type)
        if fuel_type:
            queryset = queryset.filter(fuel_type=fuel_type)
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)

        return queryset.select_related("issued_to", "issued_by", "approved_by", "vehicle").prefetch_related("items")

    # --------------------------
    # CREATE ISSUE RECORD
    # --------------------------
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            issue = serializer.save(issued_by=request.user)

            # Auto-approve non-fuel tools
            tool_uses_fuel = False
            if issue.issue_type == "tool" and issue.items.exists():
                item = issue.items.first().item
                if item.category == "tool" and hasattr(item, "tool"):
                    tool_uses_fuel = item.tool.uses_fuel

            if issue.issue_type == "tool" and not tool_uses_fuel:
                issue.approval_status = "Approved"
                issue.status = "Issued"
                issue.save()

            # Create report
            report_type = "issue_request"
            if issue.issue_type == "fuel":
                report_type = "fuel_request"
            elif issue.issue_type == "tool":
                report_type = "fuel_request" if tool_uses_fuel else "tool_auto_issued"

            Report.objects.create(report_type=report_type, issue_record=issue, created_by=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # --------------------------
    # ISSUED ITEMS BY EMPLOYEE
    # --------------------------
    @action(detail=False, methods=["get"])
    def issued_items_by_employee(self, request):
        employee_id = request.query_params.get("employee_id")
        if not employee_id:
            return Response({"error": "employee_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        issued_items = IssueItem.objects.filter(
            issue_record__issued_to_id=employee_id,
            issue_record__status="Issued",
            issue_record__issue_type="tool",
            returned_quantity__lt=F("quantity_issued")
        ).select_related("item", "issue_record")

        data = []
        for item in issued_items:
            data.append({
                "issue_item_id": item.id,
                "item_id": item.item.id,
                "item_name": item.item.name,
                "unit": item.item.unit,
                "quantity_issued": float(item.quantity_issued),
                "returned_quantity": float(item.returned_quantity),
                "outstanding_quantity": float(item.quantity_issued - item.returned_quantity),
                "issue_id": item.issue_record.issue_id,
                "issue_record_id": item.issue_record.id,
                "issue_date": item.issue_record.issue_date,
            })

        return Response({"issued_items": data})

    # --------------------------
    # ISSUE OUT
    # --------------------------
    @action(detail=True, methods=["post"])
    def issue_out(self, request, pk=None):
        issue = self.get_object()

        if issue.status in ["Issued", "Cancelled"]:
            msg = "Items already issued" if issue.status == "Issued" else "Cannot issue cancelled request"
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

        if issue.issue_type in ["material", "fuel"] and issue.approval_status != "Approved":
            return Response({"error": "MD approval required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check stock
        stock_issues = []
        for issue_item in issue.items.all():
            item = issue_item.item
            if item.quantity_in_stock < issue_item.quantity_issued:
                stock_issues.append({
                    "item": item.name,
                    "requested": issue_item.quantity_issued,
                    "available": item.quantity_in_stock,
                    "shortage": issue_item.quantity_issued - item.quantity_in_stock,
                    "unit": item.unit,
                })

        if stock_issues:
            return Response({"error": "Insufficient stock", "stock_issues": stock_issues}, status=status.HTTP_400_BAD_REQUEST)

        # Perform issue
        serializer = IssueOutSerializer(data=request.data, context={"issue_record": issue, "request": request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            issue.status = "Issued"
            issue.save()
            for issue_item in issue.items.all():
                item = issue_item.item
                item.quantity_in_stock -= issue_item.quantity_issued
                item.save()

                # Fuel tracking - set distance travelled, efficiency calculated by model
                if issue.issue_type == "fuel" and issue_item.current_odometer is not None:
                    last_fuel = IssueItem.objects.filter(
                        issue_record__vehicle=issue.vehicle,
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

            Report.objects.create(report_type="issue_out", issue_record=issue, created_by=request.user)

        return Response({
            "status": "Issued successfully",
            "issue_id": issue.issue_id,
            "issued_by": request.user.get_full_name(),
            "issue_date": timezone.now(),
        })

    # --------------------------
    # RETURN ITEMS
    # --------------------------
    @action(detail=True, methods=["post"])
    def return_items(self, request, pk=None):
        issue = self.get_object()

        if issue.status != "Issued":
            return Response({"error": "Only issued items can be returned"}, status=status.HTTP_400_BAD_REQUEST)
        if issue.issue_type != "tool":
            return Response({"error": "Returns only apply to tools"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReturnRecordSerializer(data=request.data, context={"issue_record": issue, "request": request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save()
            all_returned = all(item.returned_quantity == item.quantity_issued for item in issue.items.all())
            if all_returned:
                issue.status = "Returned"
                issue.actual_return_date = timezone.now()
                issue.save()
            Report.objects.create(report_type="item_returned", issue_record=issue, created_by=request.user)

        return Response({
            "status": "Items returned successfully",
            "issue_id": issue.issue_id,
            "all_returned": all_returned,
        })


# =============================================================
# VEHICLE VIEWSET
# =============================================================
class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by("plate_number")
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        q = super().get_queryset()
        vehicle_type = self.request.query_params.get("type")
        return q.filter(vehicle_type=vehicle_type) if vehicle_type else q

    @action(detail=False, methods=['get'])
    def available(self, request):
        vehicles = Vehicle.objects.all()
        return Response(self.get_serializer(vehicles, many=True).data)

    @action(detail=True, methods=['get'])
    def fuel_history(self, request, pk=None):
        vehicle = self.get_object()
        fuel_issues = IssueRecord.objects.filter(
            vehicle=vehicle, 
            issue_type='fuel',
            fuel_type='vehicle'
        ).select_related('issued_to', 'issued_by', 'approved_by').prefetch_related('items').order_by('-issue_date')[:20]

        history = []
        for issue in fuel_issues:
            issue_item = issue.items.first() if issue.items.exists() else None
            
            # Use the efficiency already calculated by the model
            fuel_efficiency = issue_item.efficiency if issue_item else None
            fuel_quantity = float(issue_item.quantity_issued) if issue_item else None
            distance = float(issue_item.distance_travelled) if issue_item and issue_item.distance_travelled else None

            history.append({
                'issue_id': issue.issue_id,
                'issue_date': issue.issue_date,
                'fuel_quantity': fuel_quantity,
                'distance_travelled': distance,
                'fuel_efficiency': round(fuel_efficiency, 2) if fuel_efficiency is not None else None,
                'issued_to': f"{issue.issued_to.first_name} {issue.issued_to.last_name}" if issue.issued_to else None,
                'issued_by': f"{issue.issued_by.first_name} {issue.issued_by.last_name}" if issue.issued_by else None,
                'status': issue.status,
                'approval_status': issue.approval_status,
                'approval_date': issue.approval_date
            })

        return Response({
            'vehicle': vehicle.item.name,
            'plate_number': vehicle.plate_number,
            'fuel_type': vehicle.fuel_type.item.name if vehicle.fuel_type else None,
            'fuel_history': history
        })