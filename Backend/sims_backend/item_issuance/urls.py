# item_issuance/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IssueRecordViewSet, VehicleViewSet  # Removed IssueItemViewSet

router = DefaultRouter()
router.register(r'issuerecords', IssueRecordViewSet, basename='issuerecord')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('', include(router.urls)),
]
