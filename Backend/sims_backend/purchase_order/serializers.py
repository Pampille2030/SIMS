from rest_framework import serializers
from drf_writable_nested import WritableNestedModelSerializer
from .models import PurchaseOrder, PurchaseOrderItem, PurchaseOrderItemSupplier
from inventory.models import Item


# Supplier serializer
class PurchaseOrderItemSupplierSerializer(serializers.ModelSerializer):
    invoice_url = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItemSupplier
        fields = [
            "id",
            "supplier_name",
            "amount_per_unit",
            "invoice",
            "invoice_url",
            "approved_by_md",
        ]

    # Get full URL for uploaded invoice
    def get_invoice_url(self, obj):
        request = self.context.get("request")
        if obj.invoice and hasattr(obj.invoice, "url"):
            return request.build_absolute_uri(obj.invoice.url)
        return None

    # Validate only one approved supplier per item
    def validate(self, data):
        instance = self.instance
        approved_by_md = data.get("approved_by_md", False)

        if approved_by_md and instance:
            approved_exists = PurchaseOrderItemSupplier.objects.filter(
                order_item=instance.order_item,
                approved_by_md=True
            ).exclude(id=instance.id).exists()

            if approved_exists:
                raise serializers.ValidationError(
                    "Only one supplier can be approved per item."
                )

        return data


# Purchase order item serializer
class PurchaseOrderItemSerializer(WritableNestedModelSerializer):
    suppliers = PurchaseOrderItemSupplierSerializer(many=True)
    approved_supplier = serializers.SerializerMethodField()
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_unit = serializers.CharField(source="item.unit", read_only=True)

    item = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.exclude(category="vehicle")
    )

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "item",
            "item_name",
            "item_unit",
            "quantity",
            "reason",
            "suppliers",
            "approved_supplier",
        ]

    # Get the supplier approved by MD
    def get_approved_supplier(self, obj):
        approved = obj.suppliers.filter(approved_by_md=True).first()
        if approved:
            return PurchaseOrderItemSupplierSerializer(
                approved,
                context=self.context
            ).data
        return None


# Purchase order serializer
class PurchaseOrderSerializer(WritableNestedModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    # Status fields
    approval_status = serializers.CharField(read_only=True)
    payment_status = serializers.CharField(read_only=True)
    delivery_status = serializers.CharField(read_only=True)
    delivery_date = serializers.DateField(read_only=True)
    order_number = serializers.CharField(read_only=True)

    # Accounts section
    accounts_with_money = serializers.ListField(
        child=serializers.ChoiceField(
            choices=PurchaseOrder.PAYMENT_ACCOUNTS
        ),
        required=False
    )

    approved_account = serializers.ChoiceField(
        choices=PurchaseOrder.PAYMENT_ACCOUNTS,
        required=False,
        allow_null=True
    )

    # Payment section
    amount_paid = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    payment_date = serializers.DateField(
        required=False,
        allow_null=True
    )

    can_approve_order = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "order_type",
            "notes",
            "created_at",
            "items",

            # Accounts
            "accounts_with_money",
            "approved_account",

            # Payment
            "amount_paid",
            "payment_date",

            # Status
            "approval_status",
            "payment_status",
            "delivery_status",
            "delivery_date",

            "can_approve_order",
        ]

        read_only_fields = [
            "order_number",
            "created_at",
            "delivery_date",
        ]

    # Validate accounts and payment logic
    def validate(self, attrs):
        instance = self.instance

        accounts_with_money = attrs.get("accounts_with_money")
        approved_account = attrs.get("approved_account")
        amount_paid = attrs.get("amount_paid")

        # Prevent modifying accounts after MD approval
        if instance and instance.approval_status == "approved":
            if accounts_with_money and accounts_with_money != instance.accounts_with_money:
                raise serializers.ValidationError(
                    "Cannot modify accounts after MD approval."
                )

        # Approved account must be among accounts with money
        if approved_account:
            valid_accounts = accounts_with_money or (
                instance.accounts_with_money if instance else []
            )

            if not valid_accounts:
                raise serializers.ValidationError(
                    "Accounts Manager must first mark accounts with money."
                )

            if approved_account not in valid_accounts:
                raise serializers.ValidationError(
                    "Approved account must be among accounts marked with money."
                )

        # If amount is entered, approved account must exist
        if amount_paid:
            final_account = approved_account or (
                instance.approved_account if instance else None
            )

            if not final_account:
                raise serializers.ValidationError(
                    "Cannot record payment without an approved account."
                )

        return attrs

    # Check if all items have approved supplier
    def get_can_approve_order(self, obj):
        return all(
            item.suppliers.filter(approved_by_md=True).exists()
            for item in obj.items.all()
        )

    # Update purchase order: handle MD approval and payment
    def update(self, instance, validated_data):
        approved_account = validated_data.get("approved_account", None)
        amount_paid = validated_data.get("amount_paid", None)

        # If MD approves account and all suppliers are approved
        if approved_account:
            if not self.get_can_approve_order(instance):
                raise serializers.ValidationError(
                    "All items must have an approved supplier before approving order."
                )
            instance.approval_status = "approved"

        # If payment is recorded, mark as paid
        if amount_paid:
            instance.payment_status = "paid"

        return super().update(instance, validated_data)
