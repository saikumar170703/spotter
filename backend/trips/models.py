from django.db import models


class Trip(models.Model):
    """Stores a calculated trip for history purposes."""
    current_location = models.CharField(max_length=500)
    pickup_location = models.CharField(max_length=500)
    dropoff_location = models.CharField(max_length=500)
    current_cycle_hours = models.FloatField(default=0)
    result_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trip: {self.current_location} → {self.pickup_location} → {self.dropoff_location}"
