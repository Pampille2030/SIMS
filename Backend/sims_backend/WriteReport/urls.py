from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WrittenReportViewSet

router = DefaultRouter()
router.register(r"reports", WrittenReportViewSet, basename="writtenreport")

urlpatterns = [
    path("", include(router.urls)),
]
