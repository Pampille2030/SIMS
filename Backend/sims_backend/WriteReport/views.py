# WriteReport/views.py
from rest_framework import viewsets, permissions
from django.db.models import Q
from .models import WrittenReport
from .serializers import WrittenReportSerializer

class WrittenReportViewSet(viewsets.ModelViewSet):
    serializer_class = WrittenReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # MD sees all reports
        if user.role == "ManagingDirector":
            return WrittenReport.objects.all()

        # Other managers: only reports submitted by themselves or MDs
        return WrittenReport.objects.filter(
            Q(submitted_by=user) | Q(submitted_by__role="ManagingDirector")
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)
