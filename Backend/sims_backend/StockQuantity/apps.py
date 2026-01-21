from django.apps import AppConfig

class StockquantityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'StockQuantity'
    verbose_name = 'Stock Quantity'

    def ready(self):
        import StockQuantity.signals
