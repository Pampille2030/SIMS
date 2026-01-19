from django.db import models
from django.utils import timezone
from inventory.models import Item
from django.conf import settings




class StockIn(models.Model):
    stock_in_no = models.CharField(max_length=50, unique=True, editable=False)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="stock_ins")
    quantity = models.PositiveIntegerField()
    remarks = models.TextField(blank=True, null=True)
    date_added = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="%(class)s_created"
)

    def save(self, *args, **kwargs):
        # ✅ Generate a sequential stock_in_no if not set
        if not self.stock_in_no:
            last_record = StockIn.objects.order_by('id').last()
            if last_record and last_record.stock_in_no.startswith('ST-'):
                try:
                    last_number = int(last_record.stock_in_no.split('-')[1])
                except (IndexError, ValueError):
                    last_number = 0
                new_number = last_number + 1
            else:
                new_number = 1

            # Format as ST-0001, ST-0002, etc.
            self.stock_in_no = f"ST-{new_number:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.stock_in_no} - {self.item.name}"
