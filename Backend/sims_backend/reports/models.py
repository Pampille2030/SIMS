from django.db import models
from django.conf import settings

class Report(models.Model):
    REPORT_TYPES = [
        ("purchase_order", "Purchase Order"),
        ("issue_out", "Issue Out"),
        ("stock_in", "Stock In"),
        ("user_written", "User Written"),
    ]

    report_type = models.CharField(max_length=30, choices=REPORT_TYPES)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Only used for "user_written" reports
    title = models.CharField(max_length=255, blank=True, null=True)
    body = models.TextField(blank=True, null=True)

    # Links to system reports
    purchase_order = models.ForeignKey(
        "purchase_order.PurchaseOrder",  # ✅ matches your app name
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="reports"
    )
    issue_record = models.ForeignKey(
        "item_issuance.IssueRecord",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="reports"
    )
    stock_in = models.ForeignKey(
        "stockin.StockIn",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="reports"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        if self.report_type == "user_written":
            return f"[User Report] {self.title}"
        return f"[{self.get_report_type_display()}] {self.created_at.strftime('%Y-%m-%d')}"
