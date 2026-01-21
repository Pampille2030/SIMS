from rest_framework import generics, status
from rest_framework.response import Response
from django.utils import timezone

from .models import PORequest
from .serializers import PORequestSerializer
from inventory.models import Item


# ================================
# Store Manager – Create PO Request
# ================================
class PORequestCreateView(generics.CreateAPIView):
    serializer_class = PORequestSerializer

    def perform_create(self, serializer):
        item = Item.objects.get(id=self.request.data.get("item"))

        # Snapshot stock ONLY (no mutation)
        serializer.save(
            quantity_in_stock=item.quantity_in_stock
        )


# ================================
# Store Manager – View Own Requests
# ================================
class PORequestListView(generics.ListAPIView):
    serializer_class = PORequestSerializer
    queryset = PORequest.objects.all()


# ================================
# Managing Director – Approval List
# ================================
class MDPORequestListView(generics.ListAPIView):
    serializer_class = PORequestSerializer
    queryset = PORequest.objects.all()


# ================================
# Managing Director – Approve / Reject
# ================================
class MDPORequestApprovalView(generics.UpdateAPIView):
    serializer_class = PORequestSerializer
    queryset = PORequest.objects.all()

    def update(self, request, *args, **kwargs):
        po_request = self.get_object()
        status_value = request.data.get("approval_status")
        comment = request.data.get("approval_comment", "")

        if po_request.approval_status != "PENDING":
            return Response(
                {"detail": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if status_value not in ["APPROVED", "REJECTED"]:
            return Response(
                {"detail": "Invalid approval status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        po_request.approval_status = status_value
        po_request.approval_comment = comment
        po_request.approved_at = timezone.now()
        po_request.save()

        serializer = self.get_serializer(po_request)
        return Response(serializer.data, status=status.HTTP_200_OK)
