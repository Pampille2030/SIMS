from rest_framework import serializers
from .models import PORequest


class PORequestSerializer(serializers.ModelSerializer):

    item_name = serializers.CharField(source="item.name", read_only=True)
    employee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PORequest
        fields = [
            "id",
            "created_at",
            "item",
            "item_name",
            "requested_quantity",
            "quantity_in_stock",
            "employee",
            "employee_name",
            "remarks",
            "approval_status",
            "approval_comment",
            "approved_at",
        ]
        read_only_fields = [
            "quantity_in_stock",
            "approval_status",
            "approved_at",
        ]

    def get_employee_name(self, obj):
        return f"{obj.employee.full_name} ({obj.employee.job_number})"
