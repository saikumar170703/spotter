"""
Route Service — Uses free, no-API-key-required services:
  - Nominatim (OpenStreetMap) for geocoding
  - OSRM (Open Source Routing Machine) for directions
"""

import requests
import polyline as pl


NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
OSRM_URL = 'http://router.project-osrm.org'

HEADERS = {
    'User-Agent': 'SpotterELD-TripPlanner/1.0',
    'Accept': 'application/json',
}


class RouteServiceError(Exception):
    """Raised when an external API returns an error."""
    pass


def geocode(address: str) -> list:
    """
    Geocode an address string to coordinates using Nominatim.
    Returns: [{ 'lat': float, 'lng': float, 'label': str }, ...]
    """
    try:
        resp = requests.get(
            f'{NOMINATIM_URL}/search',
            params={
                'q': address,
                'format': 'json',
                'limit': 5,
                'countrycodes': 'us',
                'addressdetails': 1,
            },
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        if not data:
            raise RouteServiceError(f'No results found for address: {address}')

        results = []
        for item in data:
            results.append({
                'lat': float(item['lat']),
                'lng': float(item['lon']),
                'label': item.get('display_name', address),
            })
        return results

    except requests.RequestException as e:
        raise RouteServiceError(f'Geocoding failed: {str(e)}')


def get_directions(coordinates: list) -> dict:
    """
    Get driving directions between [lng, lat] coordinate pairs using OSRM.

    Args:
        coordinates: List of [lng, lat] pairs, e.g. [[-87.6, 41.8], [-96.7, 32.7]]

    Returns: {
        'distance_miles': float,
        'duration_hours': float,
        'geometry': [[lat, lng], ...],  # decoded polyline for Leaflet
        'segments': [{ 'distance_miles', 'duration_hours', 'steps': [...] }],
        'bbox': [...],
        'raw_geometry_coords': [[lng, lat], ...]
    }
    """
    try:
        # Build coordinate string for OSRM: lng,lat;lng,lat
        coord_str = ';'.join([f'{c[0]},{c[1]}' for c in coordinates])

        resp = requests.get(
            f'{OSRM_URL}/route/v1/driving/{coord_str}',
            params={
                'overview': 'full',
                'geometries': 'polyline',
                'steps': 'true',
                'annotations': 'false',
            },
            headers=HEADERS,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get('code') != 'Ok' or not data.get('routes'):
            raise RouteServiceError('No route found between the given locations.')

        route = data['routes'][0]

        # Decode the polyline geometry
        decoded = pl.decode(route['geometry'])  # [(lat, lng), ...]
        geometry_for_leaflet = [[lat, lng] for lat, lng in decoded]
        raw_coords = [[lng, lat] for lat, lng in decoded]

        # Distance: meters → miles
        distance_miles = route['distance'] * 0.000621371
        # Duration: seconds → hours
        duration_hours = route['duration'] / 3600

        # Process legs and steps
        segments = []
        for leg in route.get('legs', []):
            steps = []
            for step in leg.get('steps', []):
                maneuver = step.get('maneuver', {})
                instruction = _build_instruction(step)
                steps.append({
                    'instruction': instruction,
                    'distance_miles': round(step.get('distance', 0) * 0.000621371, 2),
                    'duration_minutes': round(step.get('duration', 0) / 60, 2),
                    'way_points': [],
                })
            segments.append({
                'distance_miles': round(leg.get('distance', 0) * 0.000621371, 2),
                'duration_hours': round(leg.get('duration', 0) / 3600, 2),
                'steps': steps,
            })

        # Calculate bounding box from geometry
        lats = [p[0] for p in geometry_for_leaflet]
        lngs = [p[1] for p in geometry_for_leaflet]
        bbox = [min(lngs), min(lats), max(lngs), max(lats)] if lats else []

        return {
            'distance_miles': round(distance_miles, 2),
            'duration_hours': round(duration_hours, 2),
            'geometry': geometry_for_leaflet,
            'segments': segments,
            'bbox': bbox,
            'raw_geometry_coords': raw_coords,
        }

    except requests.RequestException as e:
        raise RouteServiceError(f'Directions request failed: {str(e)}')


def _build_instruction(step):
    """Build a human-readable instruction from an OSRM step."""
    maneuver = step.get('maneuver', {})
    step_type = maneuver.get('type', '')
    modifier = maneuver.get('modifier', '')
    name = step.get('name', '')

    if step_type == 'depart':
        return f'Head {modifier} on {name}'.strip() if name else f'Depart heading {modifier}'.strip()
    elif step_type == 'arrive':
        return 'Arrive at your destination'
    elif step_type == 'turn':
        direction = modifier.replace('-', ' ') if modifier else ''
        return f'Turn {direction} onto {name}'.strip() if name else f'Turn {direction}'.strip()
    elif step_type == 'merge':
        return f'Merge onto {name}'.strip() if name else 'Merge'
    elif step_type == 'on ramp' or step_type == 'off ramp':
        return f'Take the ramp onto {name}'.strip() if name else 'Take the ramp'
    elif step_type == 'fork':
        direction = modifier.replace('-', ' ') if modifier else ''
        return f'Keep {direction} onto {name}'.strip() if name else f'Keep {direction}'.strip()
    elif step_type == 'new name':
        return f'Continue onto {name}'.strip() if name else 'Continue straight'
    elif step_type == 'continue':
        return f'Continue on {name}'.strip() if name else 'Continue straight'
    elif step_type == 'roundabout':
        return f'Enter roundabout, exit onto {name}'.strip() if name else 'Enter roundabout'
    elif step_type == 'end of road':
        direction = modifier.replace('-', ' ') if modifier else ''
        return f'Turn {direction} onto {name}'.strip() if name else f'Turn {direction}'.strip()
    else:
        if name:
            return f'Continue on {name}'
        return f'{step_type} {modifier}'.strip().capitalize() or 'Continue'


def get_full_route(current_coords, pickup_coords, dropoff_coords):
    """
    Get the full route with two legs: current→pickup and pickup→dropoff.

    Args:
        current_coords: [lng, lat]
        pickup_coords: [lng, lat]
        dropoff_coords: [lng, lat]

    Returns: {
        'legs': [
            { 'type': 'to_pickup', ...route_data },
            { 'type': 'to_dropoff', ...route_data },
        ],
        'total_distance_miles': float,
        'total_duration_hours': float,
        'full_geometry': [[lat, lng], ...],
    }
    """
    # Get directions for each leg separately for accurate per-leg data
    leg1 = get_directions([current_coords, pickup_coords])
    leg2 = get_directions([pickup_coords, dropoff_coords])

    leg1['type'] = 'to_pickup'
    leg2['type'] = 'to_dropoff'

    return {
        'legs': [leg1, leg2],
        'total_distance_miles': round(leg1['distance_miles'] + leg2['distance_miles'], 2),
        'total_duration_hours': round(leg1['duration_hours'] + leg2['duration_hours'], 2),
        'full_geometry': leg1['geometry'] + leg2['geometry'],
    }
