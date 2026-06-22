"""
Serializers for the trips API.
"""

from rest_framework import serializers


class TripInputSerializer(serializers.Serializer):
    """Validates trip calculation input."""
    current_location = serializers.CharField(max_length=500, help_text="Current location address")
    pickup_location = serializers.CharField(max_length=500, help_text="Pickup location address")
    dropoff_location = serializers.CharField(max_length=500, help_text="Dropoff location address")
    current_cycle_hours = serializers.FloatField(
        min_value=0, max_value=70,
        help_text="Hours already used in 70-hr/8-day cycle"
    )

    # Optional: pre-geocoded coordinates (skip geocoding if provided)
    current_coords = serializers.ListField(
        child=serializers.FloatField(), required=False, min_length=2, max_length=2,
        help_text="[lng, lat] of current location"
    )
    pickup_coords = serializers.ListField(
        child=serializers.FloatField(), required=False, min_length=2, max_length=2,
        help_text="[lng, lat] of pickup location"
    )
    dropoff_coords = serializers.ListField(
        child=serializers.FloatField(), required=False, min_length=2, max_length=2,
        help_text="[lng, lat] of dropoff location"
    )


class GeocodeQuerySerializer(serializers.Serializer):
    """Validates geocode query parameter."""
    q = serializers.CharField(max_length=500, help_text="Address to geocode")
