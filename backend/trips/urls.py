"""URL configuration for trips API."""
from django.urls import path
from . import views

urlpatterns = [
    path('trip/calculate/', views.calculate_trip, name='calculate-trip'),
    path('trip/geocode/', views.geocode_address, name='geocode-address'),
    path('health/', views.health_check, name='health-check'),
]
