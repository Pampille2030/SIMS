from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import InventoryStock
from .serializers import InventoryStockSerializer

class InventoryStockView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        category = request.query_params.get("category")
        # Exclude vehicles
        items = InventoryStock.objects.exclude(category="vehicle").order_by("name")
        if category and category != "all":
            items = items.filter(category=category)
        serializer = InventoryStockSerializer(items, many=True)
        return Response(serializer.data)
