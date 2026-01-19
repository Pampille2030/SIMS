from django.db import models
from inventory.models import Item  

class PurchaseOrder(models.Model):
    ORDER_TYPES = [
        ('reorder', 'Reorder'),
        ('accumulate', 'Accumulate'),
    ]

    order_number = models.CharField(max_length=20, unique=True, blank=True)  # remove UUID
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    # Flow status
    approval_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='pending'
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('paid', 'Paid')
        ],
        default='pending'
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('delivered', 'Delivered')
        ],
        default='pending'
    )

    def save(self, *args, **kwargs):
        if not self.order_number:
            last_order = PurchaseOrder.objects.order_by('-id').first()
            if last_order and last_order.order_number.startswith("PO"):
                last_num = int(last_order.order_number.replace("PO", ""))
                self.order_number = f"PO{last_num + 1}"
            else:
                self.order_number = "PO1"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.order_number} ({self.get_order_type_display()})"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items'
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        related_name='order_items'
    )
    quantity = models.PositiveIntegerField()
    reason = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.item.name} - {self.quantity} {self.item.unit} (Order #{self.purchase_order.order_number})"


class PurchaseOrderItemSupplier(models.Model):
    order_item = models.ForeignKey(
        PurchaseOrderItem,
        on_delete=models.CASCADE,
        related_name='suppliers'
    )
    supplier_name = models.CharField(max_length=100)
    amount_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    invoice = models.FileField(upload_to='invoices/', blank=True, null=True)
    approved_by_md = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.supplier_name} - {self.amount_per_unit} {self.order_item.item.unit} (Item {self.order_item.item.name})"

    def save(self, *args, **kwargs):
        # Ensure only one supplier can be approved per order item
        if self.approved_by_md and self.order_item_id:
            PurchaseOrderItemSupplier.objects.filter(
                order_item=self.order_item,
                approved_by_md=True
            ).exclude(id=self.id).update(approved_by_md=False)
        
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order_item'],
                condition=models.Q(approved_by_md=True),
                name='only_one_approved_supplier_per_item'
            )
        ]
