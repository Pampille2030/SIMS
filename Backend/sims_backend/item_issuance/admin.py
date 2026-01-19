from django.contrib import admin
from .models import IssueRecord, IssueItem

admin.site.register(IssueRecord)
admin.site.register(IssueItem)
