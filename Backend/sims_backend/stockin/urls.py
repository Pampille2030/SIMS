from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import StockInViewSet

router = DefaultRouter()
router.register(r'', StockInViewSet, basename='stockin')  # <-- empty string

urlpatterns = [
    path('', include(router.urls)),
]
