from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import PurchaseOrder, PurchaseOrderItemSupplier
from .serializers import PurchaseOrderSerializer, PurchaseOrderItemSupplierSerializer
from inventory.models import Item


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().prefetch_related('items', 'items__suppliers')
    serializer_class = PurchaseOrderSerializer

    # Ensure request context is passed to nested serializers
    def get_serializer(self, *args, **kwargs):
        kwargs['context'] = self.get_serializer_context()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(*args, **kwargs)

        # Exclude vehicles from "item" dropdown
        if isinstance(serializer, PurchaseOrderSerializer):
            for item_serializer in serializer.fields['items'].child.fields.values():
                if getattr(item_serializer, 'queryset', None) is not None:
                    item_serializer.queryset = Item.objects.exclude(category="vehicle")
        return serializer

    # ---------------- MD APPROVES SUPPLIER ----------------
    @action(detail=True, methods=['post'])
    def approve_supplier(self, request, pk=None):
        purchase_order = self.get_object()
        supplier_id = request.data.get('supplier_id')

        if not supplier_id:
            return Response({"error": "supplier_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            supplier = PurchaseOrderItemSupplier.objects.get(
                id=supplier_id,
                order_item__purchase_order=purchase_order
            )

            supplier.approved_by_md = True
            supplier.save()
            # Unapprove other suppliers for same item
            PurchaseOrderItemSupplier.objects.filter(order_item=supplier.order_item).exclude(id=supplier.id).update(approved_by_md=False)

            return Response({
                "message": f"Supplier {supplier.supplier_name} approved successfully",
                "approved_supplier": PurchaseOrderItemSupplierSerializer(supplier, context={"request": request}).data
            }, status=status.HTTP_200_OK)

        except PurchaseOrderItemSupplier.DoesNotExist:
            return Response(
                {"error": "Supplier not found or does not belong to this purchase order"},
                status=status.HTTP_404_NOT_FOUND
            )

    # ---------------- MD FINAL APPROVE ORDER ----------------
    @action(detail=True, methods=['post'])
    def final_approve_order(self, request, pk=None):
        purchase_order = self.get_object()
        can_approve = all(
            item.suppliers.filter(approved_by_md=True).exists()
            for item in purchase_order.items.all()
        )

        if not can_approve:
            return Response(
                {"error": "Cannot approve order. Not all items have approved suppliers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        purchase_order.approval_status = 'approved'
        purchase_order.save()

        return Response(
            {"message": "Purchase order approved. Awaiting payment by accountant."},
            status=status.HTTP_200_OK
        )

    # ---------------- MARK PAID ----------------
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        purchase_order = self.get_object()
        if purchase_order.approval_status != 'approved':
            return Response(
                {"error": "Order cannot be paid before MD approval."},
                status=status.HTTP_400_BAD_REQUEST
            )

        purchase_order.payment_status = 'paid'
        purchase_order.save()
        return Response({"message": "Order marked as paid."}, status=status.HTTP_200_OK)

    # ---------------- MARK DELIVERED ----------------
# ---------------- MARK DELIVERED ----------------
@action(detail=True, methods=['post'])
def mark_delivered(self, request, pk=None):
    purchase_order = self.get_object()
    
    # Ensure order has been paid
    if purchase_order.payment_status != 'paid':
        return Response(
            {"error": "Order cannot be delivered before payment is done."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Mark delivered and save delivery date automatically
    purchase_order.delivery_status = 'delivered'
    purchase_order.save()  # Your model save() sets delivery_date automatically

    serializer = self.get_serializer(purchase_order)
    return Response(serializer.data, status=status.HTTP_200_OK)


    # ---------------- REJECT ORDER ----------------
    @action(detail=True, methods=['post'])
    def reject_order(self, request, pk=None):
        purchase_order = self.get_object()
        purchase_order.approval_status = 'rejected'
        purchase_order.save()
        return Response({"message": "Order rejected by MD."}, status=status.HTTP_200_OK)

    # ---------------- GET APPROVAL STATUS ----------------
    @action(detail=True, methods=['get'])
    def approval_status(self, request, pk=None):
        purchase_order = self.get_object()
        items_status = []

        for item in purchase_order.items.all():
            approved_supplier = item.suppliers.filter(approved_by_md=True).first()
            items_status.append({
                "item_id": item.id,
                "item_name": item.item.name,
                "quantity": item.quantity,
                "unit": item.item.unit,
                "has_approved_supplier": approved_supplier is not None,
                "approved_supplier": PurchaseOrderItemSupplierSerializer(
                    approved_supplier, context={"request": request}
                ).data if approved_supplier else None
            })

        return Response({
            "approval_status": purchase_order.approval_status,
            "payment_status": purchase_order.payment_status,
            "delivery_status": getattr(purchase_order, 'delivery_status', 'pending'),
            "items_status": items_status,
            "can_final_approve": all(status["has_approved_supplier"] for status in items_status)
        })

    # ---------------- DOWNLOAD INVOICES ----------------
    @action(detail=True, methods=['get'])
    def download_invoice(self, request, pk=None):
        purchase_order = self.get_object()
        invoices = []

        for item in purchase_order.items.all():
            for supplier in item.suppliers.all():
                if supplier.invoice:
                    invoices.append({
                        "item_name": item.item.name,
                        "supplier_name": supplier.supplier_name,
                        "invoice_url": request.build_absolute_uri(supplier.invoice.url)
                    })

        return Response({"invoices": invoices}, status=status.HTTP_200_OK)

    # ---------------- UPLOAD INVOICE ----------------
    @action(
        detail=True,
        methods=['patch'],
        url_path=r'suppliers/(?P<supplier_id>\d+)/upload-invoice'
    )
    def upload_invoice(self, request, pk=None, supplier_id=None):
        """
        Upload a mandatory invoice file for a specific supplier.
        URL: PATCH /api/purchase-orders/<order_id>/suppliers/<supplier_id>/upload-invoice/
        """
        purchase_order = self.get_object()
        supplier = get_object_or_404(
            PurchaseOrderItemSupplier,
            id=supplier_id,
            order_item__purchase_order=purchase_order
        )

        file = request.FILES.get('invoice')
        if not file:
            return Response({"error": "Invoice file is required"}, status=status.HTTP_400_BAD_REQUEST)

        supplier.invoice = file
        supplier.save()

        return Response({
            "message": f"Invoice uploaded for supplier {supplier.supplier_name}",
            "invoice_url": request.build_absolute_uri(supplier.invoice.url)
        }, status=status.HTTP_200_OK)
