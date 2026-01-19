from django.apps import AppConfig


class ItemIssuanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'item_issuance'

    def ready(self):
        import item_issuance.signals
