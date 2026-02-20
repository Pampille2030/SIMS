from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import PurchaseOrder, PurchaseOrderItemSupplier
from .serializers import PurchaseOrderSerializer, PurchaseOrderItemSupplierSerializer
from inventory.models import Item


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().prefetch_related(
        'items',
        'items__suppliers'
    )
    serializer_class = PurchaseOrderSerializer

    # Ensure request context is passed and exclude vehicles from dropdown
    def get_serializer(self, *args, **kwargs):
        kwargs['context'] = self.get_serializer_context()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(*args, **kwargs)

        if isinstance(serializer, PurchaseOrderSerializer):
            for field in serializer.fields['items'].child.fields.values():
                if getattr(field, 'queryset', None) is not None:
                    field.queryset = Item.objects.exclude(category="vehicle")

        return serializer

    # Approve a supplier for a purchase order item (MD)
    @action(detail=True, methods=['post'])
    def approve_supplier(self, request, pk=None):
        purchase_order = self.get_object()
        supplier_id = request.data.get('supplier_id')

        if not supplier_id:
            return Response(
                {"error": "supplier_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        supplier = get_object_or_404(
            PurchaseOrderItemSupplier,
            id=supplier_id,
            order_item__purchase_order=purchase_order
        )

        supplier.approved_by_md = True
        supplier.save()

        # Unapprove other suppliers for the same item
        PurchaseOrderItemSupplier.objects.filter(
            order_item=supplier.order_item
        ).exclude(id=supplier.id).update(approved_by_md=False)

        return Response({
            "message": f"Supplier {supplier.supplier_name} approved successfully",
            "approved_supplier": PurchaseOrderItemSupplierSerializer(
                supplier,
                context={"request": request}
            ).data
        })

    # Final approval of purchase order by MD
    @action(detail=True, methods=['post'])
    def final_approve_order(self, request, pk=None):
        purchase_order = self.get_object()
        approved_account = request.data.get("approved_account")

        # All items must have approved suppliers
        all_items_approved = all(
            item.suppliers.filter(approved_by_md=True).exists()
            for item in purchase_order.items.all()
        )
        if not all_items_approved:
            return Response(
                {"error": "All items must have approved suppliers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Accounts Manager must mark accounts with money
        if not purchase_order.accounts_with_money:
            return Response(
                {"error": "Accounts Manager must first mark accounts with money."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # MD must select approved account
        if not approved_account:
            return Response(
                {"error": "approved_account is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if approved_account not in purchase_order.accounts_with_money:
            return Response(
                {"error": "Approved account must be among accounts marked with money."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Approve the order
        purchase_order.approved_account = approved_account
        purchase_order.approval_status = 'approved'
        purchase_order.save()

        return Response({
            "message": "Purchase order approved successfully.",
            "approved_account": approved_account
        })

    # Record payment for the purchase order (Accountant)
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        purchase_order = self.get_object()

        if purchase_order.approval_status != 'approved':
            return Response(
                {"error": "Order cannot be paid before MD approval."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get amount and optional payment date
        amount_paid = request.data.get("amount_paid")
        payment_date = request.data.get("payment_date")

        if not amount_paid:
            return Response(
                {"error": "amount_paid is required to record payment."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save payment details
        purchase_order.payment_status = 'paid'
        purchase_order.amount_paid = amount_paid
        purchase_order.payment_date = payment_date or timezone.now().date()
        purchase_order.save()

        return Response({
            "message": "Order marked as paid.",
            "amount_paid": purchase_order.amount_paid,
            "payment_date": purchase_order.payment_date,
            "approved_account": purchase_order.approved_account
        }, status=status.HTTP_200_OK)

    # Mark purchase order as delivered
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        purchase_order = self.get_object()

        if purchase_order.payment_status != 'paid':
            return Response(
                {"error": "Order cannot be delivered before payment is done."},
                status=status.HTTP_400_BAD_REQUEST
            )

        purchase_order.delivery_status = 'delivered'
        purchase_order.save()

        serializer = self.get_serializer(purchase_order)
        return Response(serializer.data)

    # Reject the purchase order (MD)
    @action(detail=True, methods=['post'])
    def reject_order(self, request, pk=None):
        purchase_order = self.get_object()
        purchase_order.approval_status = 'rejected'
        purchase_order.save()

        return Response(
            {"message": "Order rejected by MD."},
            status=status.HTTP_200_OK
        )

    # Get current approval and supplier status
    @action(detail=True, methods=['get'])
    def approval_status(self, request, pk=None):
        purchase_order = self.get_object()
        items_status = []

        for item in purchase_order.items.all():
            approved_supplier = item.suppliers.filter(
                approved_by_md=True
            ).first()

            items_status.append({
                "item_id": item.id,
                "item_name": item.item.name,
                "quantity": item.quantity,
                "unit": item.item.unit,
                "has_approved_supplier": approved_supplier is not None,
                "approved_supplier": PurchaseOrderItemSupplierSerializer(
                    approved_supplier,
                    context={"request": request}
                ).data if approved_supplier else None
            })

        return Response({
            "approval_status": purchase_order.approval_status,
            "payment_status": purchase_order.payment_status,
            "delivery_status": purchase_order.delivery_status,
            "approved_account": purchase_order.approved_account,
            "accounts_with_money": purchase_order.accounts_with_money,
            "can_final_approve": all(
                status["has_approved_supplier"] for status in items_status
            ),
            "items_status": items_status
        })

    # Download all invoices for a purchase order
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
                        "invoice_url": request.build_absolute_uri(
                            supplier.invoice.url
                        )
                    })

        return Response({"invoices": invoices})

    # Upload invoice file for a specific supplier
    @action(
        detail=True,
        methods=['patch'],
        url_path=r'suppliers/(?P<supplier_id>\d+)/upload-invoice'
    )
    def upload_invoice(self, request, pk=None, supplier_id=None):
        purchase_order = self.get_object()

        supplier = get_object_or_404(
            PurchaseOrderItemSupplier,
            id=supplier_id,
            order_item__purchase_order=purchase_order
        )

        file = request.FILES.get('invoice')

        if not file:
            return Response(
                {"error": "Invoice file is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        supplier.invoice = file
        supplier.save()

        return Response({
            "message": f"Invoice uploaded for {supplier.supplier_name}",
            "invoice_url": request.build_absolute_uri(supplier.invoice.url)
        })
