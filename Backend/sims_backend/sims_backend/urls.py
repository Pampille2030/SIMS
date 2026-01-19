from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),  
    path('api/inventory/', include('inventory.urls')),
    path('api/purchase-orders/', include('purchase_order.urls')),
    path('api/item_issuance/', include('item_issuance.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/stockin/', include('stockin.urls')), 
    path("api/reports/", include("reports.urls")),
    path('api/notifications/', include('notifications_app.urls')),
    path("api/returns/", include("returns.urls")),
    path("api/", include("WriteReport.urls")),
]

#  serve uploaded invoice PDFs
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
