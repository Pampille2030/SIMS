from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from .models import Employee
from .serializers import EmployeeSerializer


# ==================================================
# Employee ViewSet
# ==================================================
class EmployeeViewSet(viewsets.ModelViewSet):
    """
    Employee management:
    - Create
    - Update
    - List
    - Deactivate (fire)
    - Approve / Reject (MD)
    """

    serializer_class = EmployeeSerializer
    queryset = Employee.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    # ---------------------------
    # Filters
    # ---------------------------
    def get_queryset(self):
        """
        Optional filters:
        - status=Active
        - status=Inactive
        - approval_status=PENDING/APPROVED/REJECTED
        """
        queryset = Employee.objects.all().order_by("-created_at")

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter in ["Active", "Inactive"]:
            queryset = queryset.filter(status=status_filter)

        # Filter by approval status
        approval_filter = self.request.query_params.get("approval_status")
        if approval_filter in ["PENDING", "APPROVED", "REJECTED"]:
            queryset = queryset.filter(approval_status=approval_filter)

        return queryset

    # ---------------------------
    # Create Employee
    # ---------------------------
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()

        return Response(
            {
                "message": f"Employee '{employee.full_name}' created successfully.",
                "employee": EmployeeSerializer(employee).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ---------------------------
    # Terminate Employee
    # ---------------------------
    @action(detail=True, methods=["post"])
    def fire(self, request, pk=None):
        """
        Soft termination (kept in DB, marked inactive)
        """
        employee = self.get_object()

        if employee.status == "Inactive":
            return Response(
                {"error": "Employee is already inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee.status = "Inactive"
        employee.save(update_fields=["status"])

        return Response(
            {
                "message": f"Employee '{employee.full_name}' marked as inactive.",
                "employee": EmployeeSerializer(employee).data,
            },
            status=status.HTTP_200_OK,
        )

    # ---------------------------
    # Approve Employee
    # ---------------------------
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Mark employee as approved (MD action)
        """
        employee = self.get_object()

        if employee.approval_status == "APPROVED":
            return Response(
                {"error": "Employee is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee.approval_status = "APPROVED"
        employee.status = "Active"  # automatically activate on approval
        employee.save(update_fields=["approval_status", "status"])

        return Response(
            {
                "message": f"Employee '{employee.full_name}' approved successfully.",
                "employee": EmployeeSerializer(employee).data,
            },
            status=status.HTTP_200_OK,
        )

    # ---------------------------
    # Reject Employee
    # ---------------------------
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Mark employee as rejected (MD action)
        """
        employee = self.get_object()

        if employee.approval_status == "REJECTED":
            return Response(
                {"error": "Employee is already rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee.approval_status = "REJECTED"
        employee.status = "Inactive"  # ensure inactive if rejected
        employee.save(update_fields=["approval_status", "status"])

        return Response(
            {
                "message": f"Employee '{employee.full_name}' rejected.",
                "employee": EmployeeSerializer(employee).data,
            },
            status=status.HTTP_200_OK,
        )
