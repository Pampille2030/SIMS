from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from django.utils import timezone
from django.db import transaction, models
from django.db.models import Q
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


class IssueRecordViewSet(viewsets.ModelViewSet):
    queryset = IssueRecord.objects.all()
    serializer_class = IssueRecordSerializer

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        issue_record = self.get_object()
        serializer = CancelIssueSerializer(
            data=request.data, context={'issue_record': issue_record}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "status": "Cancelled",
                "issue_id": issue_record.issue_id,
                "cancelled_reason": request.data.get("reason", "")
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """MD approves a pending issue record."""
        issue = self.get_object()

        if issue.approval_status == "Approved":
            return Response({"detail": "Issue already approved"}, status=status.HTTP_400_BAD_REQUEST)
        if issue.approval_status == "Rejected":
            return Response({"detail": "Cannot approve a rejected issue"}, status=status.HTTP_400_BAD_REQUEST)

        # Only update approval_status, do not change status for materials/fuel
        issue.approval_status = "Approved"
        issue.approved_by = request.user
        issue.approval_date = timezone.now()
        issue.save()

        return Response({
            "detail": f"Issue {issue.issue_id} approved successfully",
            "approval_status": issue.approval_status,
            "status": issue.status  # will remain Pending for SM to issue
        }, status=status.HTTP_200_OK)


    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """MD rejects a pending issue record."""
        issue = self.get_object()

        if issue.approval_status == "Rejected":
            return Response({"detail": "Issue already rejected"}, status=status.HTTP_400_BAD_REQUEST)
        if issue.approval_status == "Approved":
            return Response({"detail": "Cannot reject an approved issue"}, status=status.HTTP_400_BAD_REQUEST)

        # Reject the issue
        issue.approval_status = "Rejected"
        issue.status = "Cancelled"  # Optional: mark as Cancelled so SM cannot issue
        issue.approved_by = request.user
        issue.approval_date = timezone.now()
        issue.save()

        return Response({
            "detail": f"Issue {issue.issue_id} rejected successfully",
            "approval_status": issue.approval_status,
            "status": issue.status
        }, status=status.HTTP_200_OK)
        

    def get_queryset(self):
        queryset = super().get_queryset()

        issue_type = self.request.query_params.get("issue_type")
        if issue_type:
            queryset = queryset.filter(issue_type=issue_type)

        fuel_type = self.request.query_params.get("fuel_type")
        if fuel_type:
            queryset = queryset.filter(fuel_type=fuel_type)

        vehicle_id = self.request.query_params.get("vehicle")
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        approval_status = self.request.query_params.get("approval_status")
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)

        return queryset.select_related(
            "issued_to", "issued_by", "approved_by", "vehicle"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            issue = serializer.save(issued_by=request.user)

            if issue.issue_type == "tool":
                tool_uses_fuel = False
                if issue.items.exists():
                    item = issue.items.first().item
                    if item.category == "tool" and hasattr(item, "tool"):
                        tool_uses_fuel = item.tool.uses_fuel

                if not tool_uses_fuel:
                    issue.approval_status = "Approved"
                    issue.status = "Issued"
                    issue.save()

            report_type = "issue_request"
            if issue.issue_type == "fuel":
                report_type = "fuel_request"
            elif issue.issue_type == "tool":
                report_type = (
                    "fuel_request" if tool_uses_fuel else "tool_auto_issued"
                )

            Report.objects.create(
                report_type=report_type,
                issue_record=issue,
                created_by=request.user,
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # =========================================================
    # ✅ ADDED: ISSUED ITEMS BY EMPLOYEE (RETURNS PAGE)
    # =========================================================
    @action(detail=False, methods=["get"])
    def issued_items_by_employee(self, request):
        employee_id = request.query_params.get("employee_id")

        if not employee_id:
            return Response(
                {"error": "employee_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        issued_items = IssueItem.objects.filter(
            issue_record__issued_to_id=employee_id,
            issue_record__status="Issued",
            issue_record__issue_type="tool",
            returned_quantity__lt=models.F("quantity_issued"),
        ).select_related("item", "issue_record")

        data = []
        for item in issued_items:
            data.append(
                {
                    "issue_item_id": item.id,
                    "item_id": item.item.id,
                    "item_name": item.item.name,
                    "unit": item.item.unit,
                    "quantity_issued": float(item.quantity_issued),
                    "returned_quantity": float(item.returned_quantity),
                    "outstanding_quantity": float(
                        item.quantity_issued - item.returned_quantity
                    ),
                    "issue_id": item.issue_record.issue_id,
                    "issue_record_id": item.issue_record.id,
                    "issue_date": item.issue_record.issue_date,
                }
            )

        return Response({"issued_items": data})

    # =========================================================

    @action(detail=True, methods=["post"])
    def issue_out(self, request, pk=None):
        issue = self.get_object()

        if issue.status == "Issued":
            return Response(
                {"error": "Items already issued"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if issue.status == "Cancelled":
            return Response(
                {"error": "Cannot issue cancelled request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if issue.issue_type == "tool":
            tool_uses_fuel = False
            if issue.items.exists():
                item = issue.items.first().item
                if item.category == "tool" and hasattr(item, "tool"):
                    tool_uses_fuel = item.tool.uses_fuel

            if not tool_uses_fuel:
                return Response(
                    {"message": "Non-fuel tools are auto-issued on creation"},
                    status=status.HTTP_200_OK,
                )

        if (
            issue.issue_type in ["material", "fuel"]
            and issue.approval_status != "Approved"
        ):
            return Response(
                {"error": "MD approval required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stock_issues = []
        for issue_item in issue.items.all():
            item = issue_item.item
            if item.quantity_in_stock < issue_item.quantity_issued:
                stock_issues.append(
                    {
                        "item": item.name,
                        "requested": issue_item.quantity_issued,
                        "available": item.quantity_in_stock,
                        "shortage": issue_item.quantity_issued
                        - item.quantity_in_stock,
                        "unit": item.unit,
                    }
                )

        if stock_issues:
            return Response(
                {"error": "Insufficient stock", "stock_issues": stock_issues},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = IssueOutSerializer(
            data=request.data,
            context={"issue_record": issue, "request": request},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            issue.status = "Issued"
            issue.save()

            for issue_item in issue.items.all():
                item = issue_item.item
                item.quantity_in_stock -= issue_item.quantity_issued
                item.save()

            Report.objects.create(
                report_type="issue_out",
                issue_record=issue,
                created_by=request.user,
            )

        return Response(
            {
                "status": "Issued successfully",
                "issue_id": issue.issue_id,
                "issued_by": request.user.get_full_name(),
                "issue_date": timezone.now(),
            }
        )

    @action(detail=True, methods=["post"])
    def return_items(self, request, pk=None):
        issue = self.get_object()

        if issue.status != "Issued":
            return Response(
                {"error": "Only issued items can be returned"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if issue.issue_type != "tool":
            return Response(
                {"error": "Returns only apply to tools"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReturnRecordSerializer(
            data=request.data, context={"issue": issue, "request": request}
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save()

            all_returned = all(
                item.returned_quantity == item.quantity_issued
                for item in issue.items.all()
            )

            if all_returned:
                issue.status = "Returned"
                issue.actual_return_date = timezone.now()
                issue.save()

            Report.objects.create(
                report_type="item_returned",
                issue_record=issue,
                created_by=request.user,
            )

        return Response(
            {
                "status": "Items returned successfully",
                "issue_id": issue.issue_id,
                "all_returned": all_returned,
            }
        )


# =============================================================
# VEHICLE VIEWSET (UPDATED WITHOUT MILEAGE TRACKING)
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
        ).select_related(
            'issued_to', 'issued_by', 'approved_by'
        ).order_by('-issue_date')[:20]
        
        history = []
        for issue in fuel_issues:
            # Get fuel quantity from the first item
            fuel_quantity = None
            if issue.items.exists():
                fuel_quantity = issue.items.first().quantity_issued
            
            history.append({
                'issue_id': issue.issue_id,
                'issue_date': issue.issue_date,
                'fuel_quantity': float(fuel_quantity) if fuel_quantity else None,
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