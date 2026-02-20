from rest_framework import serializers
from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer for Employee model."""
    
    full_name = serializers.SerializerMethodField(read_only=True)
    latest_attendance = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "job_number",
            "first_name",
            "middle_name",
            "last_name",
            "department",
            "occupation",
            "date_hired",
            "status",
            "national_id_number",
            "kra_pin",
            "sha_number",
            "nssf_number",
            "telephone",
            "bank_name",
            "bank_account_number",
            "created_at",
            "updated_at",
            "full_name",
            "latest_attendance",
        ]

        read_only_fields = [
            "created_at",
            "updated_at",
            "full_name",
            "latest_attendance",
        ]

        extra_kwargs = {
            "national_id_number": {"required": False, "allow_null": True},
            "kra_pin": {"required": False, "allow_null": True},
            "sha_number": {"required": False, "allow_null": True},
            "nssf_number": {"required": False, "allow_null": True},
            "telephone": {"required": False, "allow_null": True},
            "bank_name": {"required": False, "allow_null": True},
            "bank_account_number": {"required": False, "allow_null": True},
        }

    def get_full_name(self, obj):
        """Return employee's full name by combining name fields."""
        return " ".join(filter(None, [obj.first_name, obj.middle_name, obj.last_name]))

    def get_latest_attendance(self, obj):
        """Return the most recent attendance status."""
        latest = getattr(obj, "attendances", None)
        if latest is not None:
            latest = obj.attendances.order_by("-date").first()
            return latest.status if latest else None
        return None

    def validate_job_number(self, value):
        """Validate that job number is unique."""
        qs = Employee.objects.filter(job_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This job number is already registered.")
        return value

    def validate_national_id_number(self, value):
        """Validate that national ID is unique if provided."""
        if value:
            qs = Employee.objects.filter(national_id_number=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This National ID number is already registered.")
        return value

    def validate_kra_pin(self, value):
        """Validate that KRA PIN is unique and uppercase if provided."""
        if value:
            value = value.upper()
            qs = Employee.objects.filter(kra_pin=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This KRA PIN is already registered.")
        return value

    def validate_sha_number(self, value):
        """Validate that SHA number is unique and uppercase if provided."""
        if value:
            value = value.upper()
            qs = Employee.objects.filter(sha_number=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This SHA number is already registered.")
        return value

    def validate_nssf_number(self, value):
        """Validate that NSSF number is unique if provided."""
        if value:
            qs = Employee.objects.filter(nssf_number=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This NSSF number is already registered.")
        return value

    def validate_telephone(self, value):
        """Validate that telephone number is unique if provided."""
        if value:
            qs = Employee.objects.filter(telephone=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This phone number is already registered.")
        return value

    def validate_bank_account_number(self, value):
        """Validate that bank account number is unique if provided."""
        if value:
            qs = Employee.objects.filter(bank_account_number=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This bank account number is already registered.")
        return value