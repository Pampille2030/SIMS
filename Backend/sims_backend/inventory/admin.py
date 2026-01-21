from django.contrib import admin
from .models import Item, Fuel, Vehicle, Tool, Material


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "unit", "quantity_in_stock", "reorder_level")
    list_filter = ("category", "requires_approval")
    search_fields = ("name",)


@admin.register(Fuel)
class FuelAdmin(admin.ModelAdmin):
    list_display = ("item",)
    list_select_related = ("item",)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = (
        "item",
        "plate_number",
    )
    list_select_related = ("item",)


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ("item", "condition", "returnable")
    list_select_related = ("item",)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("item",)
    list_select_related = ("item",)