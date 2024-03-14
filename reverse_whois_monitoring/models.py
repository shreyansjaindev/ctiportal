from django.db import models
from django.contrib.auth.models import User


class MonitoringTerm(models.Model):
    created = models.DateTimeField(auto_now=True)
    search_query = models.JSONField(default=list)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
