from rest_framework import serializers
from .models import InventoryStock

class InventoryStockSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(read_only=True)  # source removed
    unit = serializers.CharField(source="unit_display", read_only=True)
    quantity_in_stock = serializers.DecimalField(
        source="quantity", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = InventoryStock
        fields = ["item_name", "reorder_level", "quantity_in_stock", "unit"]
