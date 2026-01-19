from django.urls import path
from . import views

urlpatterns = [
    path("returned-items/", views.ReturnedItemListCreateView.as_view(), name="returned-items"),
    path("get_issued_items_by_employee/", views.get_issued_items_by_employee, name="get_issued_items_by_employee"),
    path("employees_with_issued_items/", views.get_employee_issued_items_list, name="employees_with_issued_items"),
]
