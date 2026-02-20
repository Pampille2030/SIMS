from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from .models import Employee
from .serializers import EmployeeSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee operations."""

    serializer_class = EmployeeSerializer
    queryset = Employee.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter employees by status query parameter."""
        queryset = Employee.objects.all().order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        if status_filter in ["Active", "Inactive"]:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new employee with active status."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = serializer.save(status="Active")

        return Response(
            {
                "message": f"Employee '{employee.full_name}' created successfully.",
                "employee": EmployeeSerializer(employee).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def fire(self, request, pk=None):
        """Soft delete employee by marking as inactive."""
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