from rest_framework import serializers
from .models import StockIn
from inventory.models import Item

class StockInSerializer(serializers.ModelSerializer):
    item_display = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = StockIn
        fields = ["id", "stock_in_no", "item", "item_display", "quantity", "remarks", "date_added"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # ✅ Format date_added into 24-hour time (dd/mm/yyyy HH:MM)
        if instance.date_added:
            data["date_added"] = instance.date_added.strftime("%d/%m/%Y %H:%M")
        return data

    def create(self, validated_data):
        item = validated_data["item"]
        quantity = validated_data.get("quantity", 0)

        # 🔹 Update item stock
        item.quantity_in_stock += quantity
        item.save()

        # 🔹 Generate stock number
        last_stock = StockIn.objects.order_by("id").last()
        next_number = 1
        if last_stock:
            try:
                last_num = int(last_stock.stock_in_no.split("-")[1])
                next_number = last_num + 1
            except (IndexError, ValueError):
                pass

        stock_in_no = f"ST-{next_number:04d}"
        validated_data["stock_in_no"] = stock_in_no

        return StockIn.objects.create(**validated_data)
