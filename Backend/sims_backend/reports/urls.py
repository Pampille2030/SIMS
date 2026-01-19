# reports/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('purchase-orders/', views.purchase_orders_report, name='purchase_orders_report'),
    path('issue-out/', views.issue_out_report, name='issue_out_report'),
    path('stock-in/', views.stock_in_report, name='stock_in_report'),
]