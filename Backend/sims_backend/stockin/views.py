from rest_framework import viewsets
from .models import StockIn
from .serializers import StockInSerializer

class StockInViewSet(viewsets.ModelViewSet):
    queryset = StockIn.objects.all().order_by("-date_added")
    serializer_class = StockInSerializer
