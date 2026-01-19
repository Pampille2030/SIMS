from rest_framework import routers
from .views import EmployeeViewSet
from django.urls import path, include

router = routers.DefaultRouter()
router.register(r'', EmployeeViewSet, basename='employee')  # '' is fine here

urlpatterns = [
    path('', include(router.urls)),  # include router
]
