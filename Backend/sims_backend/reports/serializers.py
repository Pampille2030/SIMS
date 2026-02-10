from rest_framework import serializers
from purchase_order.models import PurchaseOrder, PurchaseOrderItem, PurchaseOrderItemSupplier
from stockin.models import StockIn
from inventory.models import Item
from item_issuance.models import IssueRecord, IssueItem

# -----------------------------
# Purchase Order Serializers
# -----------------------------
class ApprovedSupplierReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItemSupplier
        fields = ["id", "supplier_name", "amount_per_unit", "approved_by_md"]
        read_only_fields = fields


class PurchaseOrderItemReportSerializer(serializers.ModelSerializer):
    approved_supplier = serializers.SerializerMethodField()
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_unit = serializers.CharField(source="item.unit", read_only=True)
    amount = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "item_name", "item_unit", "quantity", "approved_supplier", "amount"]
        read_only_fields = fields

    def get_approved_supplier(self, obj):
        approved_supplier = obj.suppliers.filter(approved_by_md=True).first()
        return approved_supplier.supplier_name if approved_supplier else None

    def get_amount(self, obj):
        approved_supplier = obj.suppliers.filter(approved_by_md=True).first()
        if approved_supplier and approved_supplier.amount_per_unit:
            return obj.quantity * approved_supplier.amount_per_unit
        return 0


class PurchaseOrderReportSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="order_number", read_only=True)
    items = serializers.SerializerMethodField()
    total_order_amount = serializers.SerializerMethodField()
    payment_status = serializers.CharField(read_only=True)
    delivery_status = serializers.CharField(read_only=True)
    delivery_date = serializers.SerializerMethodField()  
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "po_number",
            "order_type",
            "created_at_formatted",
            "payment_status",
            "delivery_status",
            "delivery_date",
            "items",
            "total_order_amount",
        ]
        read_only_fields = fields

    def get_items(self, obj):
        items_with_approved_suppliers = [
            item for item in obj.items.all() if item.suppliers.filter(approved_by_md=True).exists()
        ]
        return PurchaseOrderItemReportSerializer(items_with_approved_suppliers, many=True, context=self.context).data

    def get_total_order_amount(self, obj):
        total = 0
        for item in obj.items.all():
            approved_supplier = item.suppliers.filter(approved_by_md=True).first()
            if approved_supplier and approved_supplier.amount_per_unit:
                total += item.quantity * approved_supplier.amount_per_unit
        return total

    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M")

    def get_delivery_date(self, obj):
        if obj.delivery_status.lower() == "delivered" and obj.delivery_date:
            return obj.delivery_date.strftime("%Y-%m-%d")
        return obj.delivery_status 

class IssueRecordReportSerializer(serializers.ModelSerializer):
    issued_to_name = serializers.SerializerMethodField(read_only=True)
    item_name = serializers.SerializerMethodField(read_only=True)
    quantity_issued = serializers.SerializerMethodField(read_only=True)
    quantity_remaining = serializers.SerializerMethodField(read_only=True)  # now pulls from item.quantity_in_stock

    class Meta:
        model = IssueRecord
        fields = [
            'issue_date',
            'item_name',
            'quantity_issued',
            'quantity_remaining',  
            'status',              
            'reason',
            'issued_to_name',
        ]
        read_only_fields = fields

    def get_issued_to_name(self, obj):
        if obj.issued_to:
            return f"{obj.issued_to.first_name} {obj.issued_to.last_name} ({obj.issued_to.job_number})"
        return None

    def get_item_name(self, obj):
        first_item = obj.items.first()
        return first_item.item.name if first_item else None

    def get_quantity_issued(self, obj):
        first_item = obj.items.first()
        return first_item.quantity_issued if first_item else 0

    def get_quantity_remaining(self, obj):
        first_item = obj.items.first()
        if first_item:
          
            return first_item.item.quantity_in_stock
        return 0



class StockInReportSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    date_added = serializers.SerializerMethodField()

    class Meta:
        model = StockIn
        fields = ['id', 'stock_in_no', 'item_name', 'quantity', 'remarks', 'date_added']
        read_only_fields = fields

    def get_date_added(self, obj):
        return obj.date_added.strftime("%Y-%m-%d %H:%M")


class ReturnToolReportSerializer(serializers.ModelSerializer):
    tool = serializers.SerializerMethodField()
    quantity_issued = serializers.SerializerMethodField()
    quantity_returned = serializers.SerializerMethodField()
    outstanding_quantity = serializers.SerializerMethodField()
    issued_to = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()

    class Meta:
        model = IssueRecord
        fields = [
            'date',
            'tool',
            'quantity_issued',
            'quantity_returned',
            'outstanding_quantity',
            'issued_to',
        ]
        read_only_fields = fields

    def get_date(self, obj):
        return obj.issue_date.strftime("%Y-%m-%d %H:%M") if obj.issue_date else None

    def get_issued_to(self, obj):
        if obj.issued_to:
            return f"{obj.issued_to.first_name} {obj.issued_to.last_name} ({obj.issued_to.job_number})"
        return "Unknown"

    def get_tool(self, obj):
        # Return the first tool from the IssueRecord
        first_tool_item = obj.items.filter(item__category='tool').first()
        return first_tool_item.item.name if first_tool_item else None

    def get_quantity_issued(self, obj):
        first_tool_item = obj.items.filter(item__category='tool').first()
        return first_tool_item.quantity_issued if first_tool_item else 0

    def get_quantity_returned(self, obj):
        first_tool_item = obj.items.filter(item__category='tool').first()
        return first_tool_item.returned_quantity if first_tool_item else 0

    def get_outstanding_quantity(self, obj):
        first_tool_item = obj.items.filter(item__category='tool').first()
        if first_tool_item:
            return first_tool_item.quantity_issued - first_tool_item.returned_quantity
        return 0
