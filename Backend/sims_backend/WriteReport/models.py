# WriteReport/models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()

def validate_file_size(value):
    limit = 10 * 1024 * 1024  # 10 MB
    if value.size > limit:
        raise ValidationError("File too large. Maximum size is 10 MB.")

class WrittenReport(models.Model):
    REPORT_TYPES = [
        ("written", "Written"),
    ]

    subject = models.CharField(max_length=255)
    body = models.TextField()
    attachment = models.FileField(
        upload_to="reports/",
        blank=True,
        null=True,
        validators=[validate_file_size]
    )
    report_type = models.CharField(
        max_length=20,
        choices=REPORT_TYPES,
        default="written"
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="written_reports"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} by {self.submitted_by.username}"

    @property
    def recipients(self):
        """
        Returns a queryset of users who should see this report:
        - If MD submits: all other managers (SM, AC, HR)
        - If others submit: only MDs
        """
        if self.submitted_by.role == "ManagingDirector":
            return User.objects.filter(role__in=["StoreManager", "AccountsManager", "HumanResourceManager"])
        return User.objects.filter(role="ManagingDirector")
    
    def recipient_emails(self):
        """Returns a list of recipient emails for frontend display"""
        return [user.email for user in self.recipients]
