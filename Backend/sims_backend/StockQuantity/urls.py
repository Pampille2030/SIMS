# StockQuantity/urls.py
from django.urls import path
from .views import InventoryStockView

urlpatterns = [
    path('', InventoryStockView.as_view(), name='stockquantity-list'),
]
