from rest_framework import serializers
from .models import ReturnedItem
from item_issuance.models import IssueItem


class ReturnItemSerializer(serializers.ModelSerializer):
    """
    Serializer for returning issued tools.
    Enforces:
    - Only tools can be returned
    - Tool must be marked as returnable
    - Issue must be in Issued / Partially_Returned state
    - Returned quantity must not exceed outstanding quantity
    """

    issue_item_id = serializers.IntegerField(write_only=True)
    condition = serializers.CharField()
    
    issue_item = serializers.StringRelatedField(read_only=True)
    item_name = serializers.CharField(source="issue_item.item.name", read_only=True)
    item_category = serializers.CharField(source="issue_item.item.category", read_only=True)
    employee_name = serializers.SerializerMethodField()
    return_date = serializers.DateTimeField(read_only=True)
    max_returnable_quantity = serializers.SerializerMethodField()
    is_tool_returnable = serializers.SerializerMethodField()

    class Meta:
        model = ReturnedItem
        fields = [
            "id",
            "return_number",
            "return_date",
            "issue_item_id",
            "issue_item",
            "item_name",
            "item_category",
            "employee_name",
            "returned_quantity",
            "condition",
            "max_returnable_quantity",
            "is_tool_returnable",
        ]
        read_only_fields = [
            "id",
            "return_number",
            "return_date",
            "issue_item",
            "item_name",
            "item_category",
            "employee_name",
            "max_returnable_quantity",
            "is_tool_returnable",
        ]

    # ------------------------------------------------------------------
    # Read-only helpers
    # ------------------------------------------------------------------

    def get_employee_name(self, obj):
        emp = obj.employee
        parts = [emp.first_name]
        if getattr(emp, "middle_name", None):
            parts.append(emp.middle_name)
        parts.append(emp.last_name)
        return " ".join(parts)

    def get_max_returnable_quantity(self, obj):
        return float(obj.issue_item.quantity_issued - obj.issue_item.returned_quantity)

    def get_is_tool_returnable(self, obj):
        """
        At this point, if the record exists, it is already validated.
        This flag is mainly for frontend clarity.
        """
        try:
            return (
                obj.issue_item.item.category == "tool"
                and obj.issue_item.item.tool
                and obj.issue_item.item.tool.returnable
            )
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Field-level validation
    # ------------------------------------------------------------------

    def validate_issue_item_id(self, value):
        """
        Validate that:
        - IssueItem exists
        - Item is a tool
        - Tool is returnable
        - Issue status allows return
        - There is outstanding quantity
        """
        try:
            issue_item = IssueItem.objects.select_related(
                "item",
                "item__tool",
                "issue_record"
            ).get(id=value)
        except IssueItem.DoesNotExist:
            raise serializers.ValidationError("Invalid issue_item_id. Item not found.")

        # Must be a tool
        if issue_item.item.category != "tool":
            raise serializers.ValidationError(
                f"Item '{issue_item.item.name}' is a {issue_item.item.category}. "
                f"Only tools can be returned."
            )

        # Tool relation must exist and be returnable
        if not hasattr(issue_item.item, "tool") or not issue_item.item.tool:
            raise serializers.ValidationError(
                f"Tool '{issue_item.item.name}' is not properly configured."
            )

        if not issue_item.item.tool.returnable:
            raise serializers.ValidationError(
                f"Tool '{issue_item.item.name}' is marked as non-returnable."
            )

        # Issue status must allow return
        if issue_item.issue_record.status not in ["Issued", "Partially_Returned"]:
            raise serializers.ValidationError(
                f"Cannot return item from issue with status "
                f"'{issue_item.issue_record.status}'."
            )

        # Must have outstanding quantity
        outstanding = issue_item.quantity_issued - issue_item.returned_quantity
        if outstanding <= 0:
            raise serializers.ValidationError(
                f"No outstanding quantity to return for '{issue_item.item.name}'."
            )

        return value

    # ------------------------------------------------------------------
    # Object-level validation
    # ------------------------------------------------------------------

    def validate(self, data):
        issue_item_id = data.get("issue_item_id")
        returned_quantity = data.get("returned_quantity", 0)
        condition = data.get("condition")

        if not issue_item_id:
            return data

        try:
            issue_item = IssueItem.objects.select_related(
                "item",
                "item__tool"
            ).get(id=issue_item_id)
        except IssueItem.DoesNotExist:
            raise serializers.ValidationError({
                "issue_item_id": "Item not found."
            })

        max_returnable = issue_item.quantity_issued - issue_item.returned_quantity

        if returned_quantity <= 0:
            raise serializers.ValidationError({
                "returned_quantity": "Returned quantity must be greater than zero."
            })

        if returned_quantity > max_returnable:
            raise serializers.ValidationError({
                "returned_quantity": (
                    f"Cannot return more than {max_returnable}. "
                    f"Issued: {issue_item.quantity_issued}, "
                    f"Already returned: {issue_item.returned_quantity}"
                )
            })

        if not condition or not condition.strip():
            raise serializers.ValidationError({
                "condition": "Condition is required when returning tools."
            })

        return data

    # ------------------------------------------------------------------
    # Create logic
    # ------------------------------------------------------------------

    def create(self, validated_data):
        issue_item_id = validated_data.pop("issue_item_id")
        returned_quantity = validated_data.get("returned_quantity")
        condition = validated_data.get("condition")

        issue_item = IssueItem.objects.select_related(
            "item",
            "item__tool",
            "issue_record"
        ).get(id=issue_item_id)

        # Update IssueItem totals
        issue_item.returned_quantity += returned_quantity
        issue_item.return_condition = condition
        issue_item.save()

        # Populate foreign keys
        validated_data["issue_item"] = issue_item
        validated_data["issue_record"] = issue_item.issue_record
        validated_data["employee"] = issue_item.issue_record.issued_to
        validated_data["returned_by"] = self.context["request"].user

        return super().create(validated_data)
