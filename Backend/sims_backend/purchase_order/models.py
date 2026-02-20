from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from inventory.models import Item


class PurchaseOrder(models.Model):

    # order types
    ORDER_TYPES = [
        ('reorder', 'Reorder'),
        ('accumulate', 'Accumulate'),
    ]

    # payment accounts
    PAYMENT_ACCOUNTS = [
        ('petty_cash', 'Petty Cash'),
        ('hay_money', 'Hay Money'),
        ('steers_money', 'Steers Money'),
        ('afes', 'AFEs'),
        ('donors_money', 'Donors Money'),
    ]

    # basic info
    order_number = models.CharField(max_length=20, unique=True, blank=True)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    # accounts marked by accounts manager
    accounts_with_money = models.JSONField(
        blank=True,
        null=True,
        help_text="Accounts marked by Accounts Manager that have available funds."
    )

    # account approved by md
    approved_account = models.CharField(
        max_length=50,
        choices=PAYMENT_ACCOUNTS,
        blank=True,
        null=True,
        help_text="Account approved by MD for payment."
    )

    # payment section
    amount_paid = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Full total amount paid to the supplier."
    )

    payment_date = models.DateField(blank=True, null=True)

    # flow status
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

    delivery_date = models.DateField(blank=True, null=True)

    # validations
    def clean(self):

        if self.pk:
            old = PurchaseOrder.objects.get(pk=self.pk)

            # prevent account change after md approval
            if old.approval_status == "approved":
                if old.accounts_with_money != self.accounts_with_money:
                    raise ValidationError("Cannot modify accounts after MD approval.")

            # prevent editing payment after paid
            if old.payment_status == "paid":
                if old.amount_paid != self.amount_paid:
                    raise ValidationError("Cannot modify amount after payment is recorded.")

                if old.approved_account != self.approved_account:
                    raise ValidationError("Cannot change approved account after payment.")

        # md approval validation
        if self.approval_status == "approved":

            if not self.accounts_with_money:
                raise ValidationError("Accounts Manager must mark accounts with money before MD approval.")

            if not self.approved_account:
                raise ValidationError("MD must select one approved account.")

            if self.approved_account not in self.accounts_with_money:
                raise ValidationError("Approved account must be among accounts marked with money.")

        # payment validation
        if self.payment_status == "paid":

            if not self.approved_account:
                raise ValidationError("Cannot record payment without approved account.")

            if not self.amount_paid:
                raise ValidationError("Accounts must enter amount paid before marking as paid.")

            if self.amount_paid <= 0:
                raise ValidationError("Amount paid must be greater than zero.")

    # save logic
    def save(self, *args, **kwargs):

        # generate order number
        if not self.order_number:
            last_order = PurchaseOrder.objects.order_by('-id').first()
            if last_order and last_order.order_number.startswith("PO"):
                last_num = int(last_order.order_number.replace("PO", ""))
                self.order_number = f"PO{last_num + 1}"
            else:
                self.order_number = "PO1"

        # auto set delivery date
        if self.delivery_status == "delivered" and not self.delivery_date:
            self.delivery_date = timezone.now().date()

        # auto set payment date
        if self.payment_status == "paid" and not self.payment_date:
            self.payment_date = timezone.now().date()

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.order_number} ({self.get_order_type_display()})"


class PurchaseOrderItem(models.Model):

    # link to purchase order
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items'
    )

    # linked inventory item
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

    # link to order item
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

    # ensure only one supplier approved per item
    def save(self, *args, **kwargs):
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
