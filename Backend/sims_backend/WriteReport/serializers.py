# WriteReport/serializers.py
from rest_framework import serializers
from .models import WrittenReport

class WrittenReportSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()

    class Meta:
        model = WrittenReport
        fields = [
            "id",
            "submitted_by",
            "subject",
            "body",
            "attachment",
            "attachment_url",
            "report_type",
            "created_at",
            "updated_at",
            "recipient",
        ]
        read_only_fields = ["id", "submitted_by", "report_type", "created_at", "updated_at", "recipient"]

    def get_attachment_url(self, obj):
        request = self.context.get("request")
        if obj.attachment:
            return request.build_absolute_uri(obj.attachment.url)
        return None

    def get_recipient(self, obj):
        # ✅ Use the helper method from model
        return obj.recipient_emails()
