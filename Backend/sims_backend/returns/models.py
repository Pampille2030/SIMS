from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.conf import settings
from item_issuance.models import IssueRecord, IssueItem
from employees.models import Employee


class ReturnedItem(models.Model):
    CONDITION_CHOICES = [
        ('Excellent', 'Excellent'),
        ('Good', 'Good'),
        ('Fair', 'Fair'),
        ('Damaged', 'Damaged'),
        ('Lost', 'Lost'),
    ]

    return_number = models.CharField(max_length=20, unique=True, blank=True)

    issue_record = models.ForeignKey(
        IssueRecord,
        on_delete=models.PROTECT,
        related_name='returns',
        null=True,
        blank=True
    )

    issue_item = models.ForeignKey(
        IssueItem,
        on_delete=models.PROTECT,
        related_name='returns'
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='returned_items'
    )

    returned_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )

    return_date = models.DateTimeField(default=timezone.now)

    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES
    )

    returned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='processed_returns'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-return_date']

    def __str__(self):
        return f"{self.return_number} - {self.issue_item.item.name}"

    def save(self, *args, **kwargs):
        if not self.return_number:
            last_item = (
                ReturnedItem.objects
                .exclude(return_number__isnull=True)
                .exclude(return_number="")
                .order_by('-id')
                .first()
            )

            next_number = 1  # RT1 default

            if last_item and last_item.return_number:
                # Expected format: RT<number>
                numeric_part = last_item.return_number.replace("RT", "")

                if numeric_part.isdigit():
                    next_number = int(numeric_part) + 1

            self.return_number = f"RT{next_number}"

        super().save(*args, **kwargs)
