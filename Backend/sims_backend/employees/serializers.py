from rest_framework import serializers
from .models import Employee

class EmployeeSerializer(serializers.ModelSerializer):
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
            "approval_status",
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

    # -------------------------
    # Serializer Methods
    # -------------------------
    def get_full_name(self, obj):
        return " ".join(filter(None, [obj.first_name, obj.middle_name, obj.last_name]))

    def get_latest_attendance(self, obj):
        latest = getattr(obj, "attendances", None)
        if latest is not None:
            latest = obj.attendances.order_by("-date").first()
            return latest.status if latest else None
        return None

    # -------------------------
    # Uniqueness Validation
    # -------------------------
    def validate_job_number(self, value):
        qs = Employee.objects.filter(job_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This job number is already registered.")
        return value

    def validate_national_id_number(self, value):
        qs = Employee.objects.filter(national_id_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This National ID number is already registered.")
        return value

    def validate_kra_pin(self, value):
        value = value.upper()
        qs = Employee.objects.filter(kra_pin=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This KRA PIN is already registered.")
        return value

    def validate_sha_number(self, value):
        value = value.upper()
        qs = Employee.objects.filter(sha_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This SHA number is already registered.")
        return value

    def validate_nssf_number(self, value):
        qs = Employee.objects.filter(nssf_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This NSSF number is already registered.")
        return value

    def validate_telephone(self, value):
        if value:
            qs = Employee.objects.filter(telephone=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This phone number is already registered.")
        return value

    def validate_bank_account_number(self, value):
        if value:
            qs = Employee.objects.filter(bank_account_number=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This bank account number is already registered.")
        return value
