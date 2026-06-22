"""
API views for trip planning.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import TripInputSerializer, GeocodeQuerySerializer
from .services import route_service, hos_engine


@api_view(['POST'])
def calculate_trip(request):
    """
    Calculate a trip plan with HOS-compliant stops and daily logs.

    POST /api/trip/calculate/
    Body: {
        "current_location": "string",
        "pickup_location": "string",
        "dropoff_location": "string",
        "current_cycle_hours": float,
        "current_coords": [lng, lat],  (optional)
        "pickup_coords": [lng, lat],   (optional)
        "dropoff_coords": [lng, lat],  (optional)
    }
    """
    serializer = TripInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    data = serializer.validated_data

    try:
        # Geocode locations if coordinates not provided
        current_coords = data.get('current_coords')
        pickup_coords = data.get('pickup_coords')
        dropoff_coords = data.get('dropoff_coords')

        locations = {}

        if not current_coords:
            results = route_service.geocode(data['current_location'])
            current_coords = [results[0]['lng'], results[0]['lat']]
            locations['current'] = results[0]['label']
        else:
            locations['current'] = data['current_location']

        if not pickup_coords:
            results = route_service.geocode(data['pickup_location'])
            pickup_coords = [results[0]['lng'], results[0]['lat']]
            locations['pickup'] = results[0]['label']
        else:
            locations['pickup'] = data['pickup_location']

        if not dropoff_coords:
            results = route_service.geocode(data['dropoff_location'])
            dropoff_coords = [results[0]['lng'], results[0]['lat']]
            locations['dropoff'] = results[0]['label']
        else:
            locations['dropoff'] = data['dropoff_location']

        # Get the full route
        route_data = route_service.get_full_route(
            current_coords, pickup_coords, dropoff_coords
        )

        # Simulate the trip through HOS engine
        trip_plan = hos_engine.simulate_trip(
            route_data,
            data['current_cycle_hours'],
        )

        # Build the response
        response_data = {
            'locations': {
                'current': {
                    'label': locations['current'],
                    'coords': [current_coords[1], current_coords[0]],  # [lat, lng]
                },
                'pickup': {
                    'label': locations['pickup'],
                    'coords': [pickup_coords[1], pickup_coords[0]],
                },
                'dropoff': {
                    'label': locations['dropoff'],
                    'coords': [dropoff_coords[1], dropoff_coords[0]],
                },
            },
            'route': {
                'legs': [
                    {
                        'type': leg['type'],
                        'distance_miles': leg['distance_miles'],
                        'duration_hours': leg['duration_hours'],
                        'geometry': leg['geometry'],
                        'steps': leg['segments'][0]['steps'] if leg.get('segments') else [],
                    }
                    for leg in route_data['legs']
                ],
                'total_distance_miles': route_data['total_distance_miles'],
                'total_duration_hours': route_data['total_duration_hours'],
                'full_geometry': route_data['full_geometry'],
            },
            'trip_plan': trip_plan,
        }

        return Response(response_data)

    except route_service.RouteServiceError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_502_BAD_GATEWAY
        )
    except Exception as e:
        return Response(
            {'error': f'An unexpected error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def geocode_address(request):
    """
    Geocode an address for autocomplete.

    GET /api/trip/geocode/?q=<address>
    """
    serializer = GeocodeQuerySerializer(data=request.query_params)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid query', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        results = route_service.geocode(serializer.validated_data['q'])
        return Response({'results': results})
    except route_service.RouteServiceError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_502_BAD_GATEWAY
        )


@api_view(['GET'])
def health_check(request):
    """Health check endpoint."""
    return Response({'status': 'ok', 'service': 'ELD Trip Planner API'})
