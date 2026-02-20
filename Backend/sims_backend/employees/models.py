from django.db import models
from django.core.validators import RegexValidator
from datetime import date


# Validators
kra_pin_validator = RegexValidator(
    regex=r'^[A-Za-z][0-9]{9}[A-Za-z]$',
    message="KRA PIN must be 11 characters: 1 letter, 9 digits, and 1 letter."
)

sha_validator = RegexValidator(
    regex=r'^[A-Za-z0-9]+$',
    message="SHA number must contain letters and numbers only."
)

nssf_validator = RegexValidator(
    regex=r'^[0-9]{7,10}$',
    message="NSSF number must be 7–10 digits."
)

bank_account_validator = RegexValidator(
    regex=r'^[0-9]{10,14}$',
    message="Bank account number must be 10–14 digits."
)

phone_validator = RegexValidator(
    regex=r'^(\+2547\d{8}|07\d{8})$',
    message="Phone number must be +2547XXXXXXXX or 07XXXXXXXX."
)


class Employee(models.Model):
    """Employee model for managing personnel information."""

    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Active",
    )

    # Basic Information
    job_number = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    occupation = models.CharField(max_length=100, blank=True, default="Unknown")
    date_hired = models.DateField(default=date.today)

    # Identification Numbers
    national_id_number = models.CharField(
        max_length=20, unique=True, null=True, blank=True
    )

    kra_pin = models.CharField(
        max_length=11,
        unique=True,
        null=True,
        blank=True,
        validators=[kra_pin_validator],
    )

    sha_number = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        validators=[sha_validator],
    )

    nssf_number = models.CharField(
        max_length=10,
        unique=True,
        null=True,
        blank=True,
        validators=[nssf_validator],
    )

    # Contact & Banking
    telephone = models.CharField(
        max_length=13,
        unique=True,
        null=True,
        blank=True,
        validators=[phone_validator],
    )

    bank_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    bank_account_number = models.CharField(
        max_length=14,
        unique=True,
        blank=True,
        null=True,
        validators=[bank_account_validator],
    )

    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['job_number']
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    @property
    def full_name(self):
        """Return employee's full name."""
        return " ".join(filter(None, [self.first_name, self.middle_name, self.last_name]))

    def save(self, *args, **kwargs):
        """Convert identifier fields to uppercase before saving."""
        if self.kra_pin:
            self.kra_pin = self.kra_pin.upper()

        if self.sha_number:
            self.sha_number = self.sha_number.upper()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.job_number})"