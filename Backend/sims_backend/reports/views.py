# reports/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, time
from django.utils import timezone
from purchase_order.models import PurchaseOrder
from item_issuance.models import IssueRecord
from stockin.models import StockIn
from .serializers import (
    PurchaseOrderReportSerializer,
    IssueRecordReportSerializer,
    StockInReportSerializer
)


# -------------------------------
# Individual reports
# -------------------------------
@api_view(['GET'])
def purchase_orders_report(request):
    return generate_purchase_orders_report(request)


@api_view(['GET'])
def issue_out_report(request):
    return generate_issue_out_report(request)


@api_view(['GET'])
def stock_in_report(request):
    return generate_stock_in_report(request)


# -------------------------------
# Combined report by date
# -------------------------------
@api_view(['GET'])
def reports_by_date(request):
    """Return combined POs, Issue Out, Stock In in a date range (newest first)"""
    from_date = request.GET.get('from')
    to_date = request.GET.get('to')

    if not from_date or not to_date:
        return Response({"error": "Both 'from' and 'to' dates are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(from_date, "%Y-%m-%d").date(), time.min))
        to_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(to_date, "%Y-%m-%d").date(), time.max))

        # ----------------------------
        # Purchase Orders
        # ----------------------------
        purchase_orders = PurchaseOrder.objects.filter(
            created_at__gte=from_date_obj,
            created_at__lte=to_date_obj
        ).prefetch_related('items__suppliers', 'items__item')
        po_data = PurchaseOrderReportSerializer(purchase_orders, many=True).data
        for entry in po_data:
            entry['report_type'] = 'purchase_order'
            if 'created_at' in entry and entry['created_at']:
                dt = datetime.fromisoformat(entry['created_at'])
                entry['created_at'] = dt.strftime('%Y-%m-%d %H:%M')

        # ----------------------------
        # Issue Records
        # ----------------------------
        issue_records = IssueRecord.objects.filter(
            issue_date__gte=from_date_obj,
            issue_date__lte=to_date_obj
        ).select_related('issued_to', 'issued_by')
        issue_data = IssueRecordReportSerializer(issue_records, many=True).data
        for entry in issue_data:
            entry['report_type'] = 'issue_out'
            if 'issue_date' in entry and entry['issue_date']:
                dt = datetime.fromisoformat(entry['issue_date'])
                entry['issue_date'] = dt.strftime('%Y-%m-%d %H:%M')

        # ----------------------------
        # Stock In Records
        # ----------------------------
        stock_in_records = StockIn.objects.filter(
            date_added__gte=from_date_obj,
            date_added__lte=to_date_obj
        ).select_related('item')
        stock_data = StockInReportSerializer(stock_in_records, many=True).data
        for entry in stock_data:
            entry['report_type'] = 'stock_in'
            if 'date_added' in entry and entry['date_added']:
                dt = datetime.fromisoformat(entry['date_added'])
                entry['date_added'] = dt.strftime('%Y-%m-%d %H:%M')

        # ----------------------------
        # Combine & sort newest first
        # ----------------------------
        combined = po_data + issue_data + stock_data
        combined_sorted = sorted(
            combined,
            key=lambda x: x.get('created_at') or x.get('issue_date') or x.get('date_added'),
            reverse=True
        )

        return Response(combined_sorted, status=status.HTTP_200_OK)

    except ValueError:
        return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------------------
# Helper functions for individual reports
# -------------------------------
def generate_purchase_orders_report(request):
    from_date = request.GET.get('from')
    to_date = request.GET.get('to')
    if not from_date or not to_date:
        return Response({"error": "Both 'from' and 'to' dates are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(from_date, "%Y-%m-%d").date(), time.min))
        to_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(to_date, "%Y-%m-%d").date(), time.max))
        purchase_orders = PurchaseOrder.objects.filter(
            created_at__gte=from_date_obj,
            created_at__lte=to_date_obj
        ).prefetch_related('items__suppliers', 'items__item')

        serializer = PurchaseOrderReportSerializer(purchase_orders, many=True)
        data = serializer.data
        for entry in data:
            if 'created_at' in entry and entry['created_at']:
                dt = datetime.fromisoformat(entry['created_at'])
                entry['created_at'] = dt.strftime('%Y-%m-%d %H:%M')
        return Response(data)

    except Exception as e:
        return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_issue_out_report(request):
    from_date = request.GET.get('from')
    to_date = request.GET.get('to')
    if not from_date or not to_date:
        return Response({"error": "Both 'from' and 'to' dates are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(from_date, "%Y-%m-%d").date(), time.min))
        to_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(to_date, "%Y-%m-%d").date(), time.max))
        issue_records = IssueRecord.objects.filter(
            issue_date__gte=from_date_obj,
            issue_date__lte=to_date_obj
        ).select_related('issued_to', 'issued_by')

        serializer = IssueRecordReportSerializer(issue_records, many=True)
        data = serializer.data
        for entry in data:
            entry['report_type'] = 'issue_out'
            if 'issue_date' in entry and entry['issue_date']:
                dt = datetime.fromisoformat(entry['issue_date'])
                entry['issue_date'] = dt.strftime('%Y-%m-%d %H:%M')

            # Ensure quantity_issued is included (comes from serializer)
            if 'quantity_issued' not in entry:
                entry['quantity_issued'] = None

        return Response(data)

    except Exception as e:
        return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_stock_in_report(request):
    from_date = request.GET.get('from')
    to_date = request.GET.get('to')
    if not from_date or not to_date:
        return Response({"error": "Both 'from' and 'to' dates are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(from_date, "%Y-%m-%d").date(), time.min))
        to_date_obj = timezone.make_aware(datetime.combine(datetime.strptime(to_date, "%Y-%m-%d").date(), time.max))
        stock_in_records = StockIn.objects.filter(
            date_added__gte=from_date_obj,
            date_added__lte=to_date_obj
        ).select_related('item')

        serializer = StockInReportSerializer(stock_in_records, many=True)
        data = serializer.data
        for entry in data:
            if 'date_added' in entry and entry['date_added']:
                dt = datetime.fromisoformat(entry['date_added'])
                entry['date_added'] = dt.strftime('%Y-%m-%d %H:%M')
        return Response(data)

    except Exception as e:
        return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
