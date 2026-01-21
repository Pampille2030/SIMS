from django.db import models
from inventory.models import Item

class InventoryStock(Item):
    """
    Proxy model to display current stock.
    Always reflects the current quantity in Item.
    """
    class Meta:
        proxy = True
        verbose_name = "Inventory Stock"
        verbose_name_plural = "Inventory Stocks"

    @property
    def item_name(self):
        return self.name.capitalize()

    @property
    def unit_display(self):
        return self.unit or ""

    @property
    def quantity(self):
        return self.quantity_in_stock  # always current value
