from rest_framework import serializers
from drf_writable_nested import WritableNestedModelSerializer
from .models import PurchaseOrder, PurchaseOrderItem, PurchaseOrderItemSupplier
from inventory.models import Item  # ✅ Import Item to filter vehicles

# -----------------------------
# Supplier Serializer
# -----------------------------
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

    def get_invoice_url(self, obj):
        request = self.context.get("request")
        if obj.invoice and hasattr(obj.invoice, "url"):
            return request.build_absolute_uri(obj.invoice.url)
        return None

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


# -----------------------------
# Purchase Order Item Serializer
# -----------------------------
class PurchaseOrderItemSerializer(WritableNestedModelSerializer):
    suppliers = PurchaseOrderItemSupplierSerializer(many=True)
    approved_supplier = serializers.SerializerMethodField()
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_unit = serializers.CharField(source="item.unit", read_only=True)

    # ✅ Filter out vehicles from the dropdown
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

    def get_approved_supplier(self, obj):
        approved = obj.suppliers.filter(approved_by_md=True).first()
        if approved:
            return PurchaseOrderItemSupplierSerializer(
                approved, context=self.context
            ).data
        return None


# -----------------------------
# Purchase Order Serializer
# -----------------------------
class PurchaseOrderSerializer(WritableNestedModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)
    approval_status = serializers.CharField(read_only=True)
    payment_status = serializers.CharField(read_only=True)
    delivery_status = serializers.CharField(read_only=True)
    delivery_date = serializers.DateField(read_only=True)  # ✅ NEW FIELD
    can_approve_order = serializers.SerializerMethodField()
    order_number = serializers.CharField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "order_type",
            "notes",
            "created_at",
            "items",
            "approval_status",    
            "payment_status",     
            "delivery_status",    
            "delivery_date",       # ✅ Include delivery_date
            "can_approve_order",
        ]
        read_only_fields = ["order_number", "created_at", "delivery_date"]

    def get_can_approve_order(self, obj):
        # Order can be approved if all items have an approved supplier
        return all(
            item.suppliers.filter(approved_by_md=True).exists()
            for item in obj.items.all()
        )
