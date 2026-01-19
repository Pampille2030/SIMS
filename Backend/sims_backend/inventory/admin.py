from django.contrib import admin
from .models import Item, Fuel, Vehicle, Tool, Material  # REMOVED: FuelType


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "unit", "quantity_in_stock", "reorder_level")
    list_filter = ("category", "requires_approval")
    search_fields = ("name",)


# REMOVED: FuelTypeAdmin class completely


@admin.register(Fuel)
class FuelAdmin(admin.ModelAdmin):
    list_display = ("item",)  # REMOVED: fuel_type from display
    list_select_related = ("item",)  # For better performance


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = (
        "item",
        "plate_number",
        "current_mileage",
        "fuel_efficiency",
    )
    list_select_related = ("item",)


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ("item", "condition", "returnable")
    list_select_related = ("item",)  # For better performance


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("item",)
    list_select_related = ("item",)  # For better performance