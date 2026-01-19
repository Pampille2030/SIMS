from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet

router = DefaultRouter()
router.register(r'', PurchaseOrderViewSet, basename='purchaseorder')  # <-- empty prefix

urlpatterns = [
    path('', include(router.urls)),
]
