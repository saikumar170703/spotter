"""
HOS Engine — Hours of Service simulation for property-carrying drivers.

Implements FMCSA HOS rules:
- 11-hour driving limit
- 14-hour on-duty window
- 30-minute break after 8 hours of cumulative driving
- 10-hour off-duty rest requirement
- 70-hour/8-day cycle limit
- 34-hour restart when cycle is exhausted
- Fuel stops every 1,000 miles
- 1-hour on-duty for pickup and dropoff
"""

from datetime import datetime, timedelta
from enum import IntEnum
from math import radians, sin, cos, sqrt, atan2


class DutyStatus(IntEnum):
    OFF_DUTY = 1
    SLEEPER_BERTH = 2
    DRIVING = 3
    ON_DUTY = 4


# HOS Constants
MAX_DRIVING_HOURS = 11.0
MAX_DUTY_WINDOW_HOURS = 14.0
BREAK_REQUIRED_AFTER_HOURS = 8.0
BREAK_DURATION_HOURS = 0.5       # 30-minute break
REST_DURATION_HOURS = 10.0       # 10-hour off-duty
CYCLE_LIMIT_HOURS = 70.0         # 70-hour/8-day cycle
RESTART_DURATION_HOURS = 34.0    # 34-hour restart
FUEL_STOP_INTERVAL_MILES = 1000  # Fuel every 1,000 miles
FUEL_STOP_DURATION_HOURS = 0.5   # 30-min fuel stop
PICKUP_DROPOFF_DURATION_HOURS = 1.0
AVERAGE_SPEED_MPH = 55.0         # Average truck speed for time estimation


def _haversine(lat1, lng1, lat2, lng2):
    """Calculate the great-circle distance between two points in miles."""
    R = 3959  # Earth's radius in miles
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def _interpolate_location(geometry, fraction):
    """
    Interpolate a lat/lng point along a geometry at a given fraction (0.0 to 1.0).
    geometry: list of [lat, lng] pairs.
    """
    if not geometry:
        return [0, 0]
    if fraction <= 0:
        return geometry[0]
    if fraction >= 1:
        return geometry[-1]

    # Calculate total distance of geometry
    total_dist = 0
    segment_dists = []
    for i in range(len(geometry) - 1):
        d = _haversine(geometry[i][0], geometry[i][1],
                       geometry[i + 1][0], geometry[i + 1][1])
        segment_dists.append(d)
        total_dist += d

    if total_dist == 0:
        return geometry[0]

    target_dist = fraction * total_dist
    accumulated = 0

    for i, d in enumerate(segment_dists):
        if accumulated + d >= target_dist:
            # Interpolate within this segment
            seg_fraction = (target_dist - accumulated) / d if d > 0 else 0
            lat = geometry[i][0] + seg_fraction * (geometry[i + 1][0] - geometry[i][0])
            lng = geometry[i][1] + seg_fraction * (geometry[i + 1][1] - geometry[i][1])
            return [round(lat, 6), round(lng, 6)]
        accumulated += d

    return geometry[-1]


def simulate_trip(route_data, current_cycle_hours, start_time=None):
    """
    Simulate a trip through the HOS rules engine.

    Args:
        route_data: {
            'legs': [
                {
                    'type': 'to_pickup' or 'to_dropoff',
                    'distance_miles': float,
                    'duration_hours': float,
                    'geometry': [[lat, lng], ...],
                }
            ],
            'total_distance_miles': float,
            'total_duration_hours': float,
            'full_geometry': [[lat, lng], ...],
        }
        current_cycle_hours: float — hours already used in 70-hr/8-day cycle
        start_time: datetime — when the trip starts (defaults to now)

    Returns: {
        'stops': [...],
        'daily_logs': [...],
        'timeline': [...],
        'total_driving_hours': float,
        'total_trip_hours': float,
        'total_distance_miles': float,
        'estimated_arrival': str,
    }
    """
    if start_time is None:
        start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

    # State tracking
    clock = start_time
    driving_since_break = 0.0      # Hours driving since last 30-min break
    driving_in_shift = 0.0         # Hours driving in current shift (max 11)
    on_duty_window_start = clock   # When the 14-hr window started
    cycle_hours_used = float(current_cycle_hours)
    total_miles_driven = 0.0

    # Results
    timeline = []  # All duty status segments
    stops = []     # Named stops (rest, fuel, pickup, dropoff)

    def add_segment(status, duration_hours, description, location, miles=0.0):
        nonlocal clock
        seg_start = clock
        seg_end = clock + timedelta(hours=duration_hours)
        timeline.append({
            'status': int(status),
            'status_name': status.name.replace('_', ' ').title(),
            'start_time': seg_start.isoformat(),
            'end_time': seg_end.isoformat(),
            'duration_hours': round(duration_hours, 4),
            'description': description,
            'location': location,
            'miles': round(miles, 1),
        })
        clock = seg_end
        return seg_start, seg_end

    def add_stop(stop_type, description, location, duration_hours):
        stops.append({
            'type': stop_type,
            'description': description,
            'location': location,
            'start_time': clock.isoformat(),
            'end_time': (clock + timedelta(hours=duration_hours)).isoformat(),
            'duration_hours': round(duration_hours, 2),
        })

    def take_break(location, reason="30-minute HOS break"):
        """Take mandatory 30-minute break."""
        nonlocal driving_since_break
        add_stop('break', reason, location, BREAK_DURATION_HOURS)
        add_segment(DutyStatus.ON_DUTY, BREAK_DURATION_HOURS, reason, location)
        driving_since_break = 0.0

    def take_rest(location, reason="10-hour mandatory rest"):
        """Take mandatory 10-hour off-duty rest."""
        nonlocal driving_since_break, driving_in_shift, on_duty_window_start
        add_stop('rest', reason, location, REST_DURATION_HOURS)
        add_segment(DutyStatus.SLEEPER_BERTH, REST_DURATION_HOURS, reason, location)
        # Reset shift counters
        driving_since_break = 0.0
        driving_in_shift = 0.0
        on_duty_window_start = clock

    def take_restart(location, reason="34-hour cycle restart"):
        """Take 34-hour restart to reset cycle."""
        nonlocal driving_since_break, driving_in_shift, on_duty_window_start, cycle_hours_used
        add_stop('restart', reason, location, RESTART_DURATION_HOURS)
        add_segment(DutyStatus.OFF_DUTY, RESTART_DURATION_HOURS, reason, location)
        # Reset everything
        driving_since_break = 0.0
        driving_in_shift = 0.0
        cycle_hours_used = 0.0
        on_duty_window_start = clock

    def take_fuel_stop(location):
        """Take a 30-minute fueling stop."""
        nonlocal cycle_hours_used
        add_stop('fuel', 'Fuel stop', location, FUEL_STOP_DURATION_HOURS)
        add_segment(DutyStatus.ON_DUTY, FUEL_STOP_DURATION_HOURS, 'Fuel stop', location)
        cycle_hours_used += FUEL_STOP_DURATION_HOURS

    def get_remaining_drive_time():
        """Get the maximum hours we can drive right now before any mandatory stop."""
        time_in_window = (clock - on_duty_window_start).total_seconds() / 3600
        remaining_window = max(0, MAX_DUTY_WINDOW_HOURS - time_in_window)
        remaining_driving = max(0, MAX_DRIVING_HOURS - driving_in_shift)
        remaining_break = max(0, BREAK_REQUIRED_AFTER_HOURS - driving_since_break)
        remaining_cycle = max(0, CYCLE_LIMIT_HOURS - cycle_hours_used)
        return min(remaining_window, remaining_driving, remaining_break, remaining_cycle)

    def drive_segment(miles, geometry, leg_description):
        """
        Drive a segment of the route, inserting stops as needed.
        """
        nonlocal driving_since_break, driving_in_shift, cycle_hours_used, total_miles_driven

        remaining_miles = miles
        miles_since_fuel = total_miles_driven % FUEL_STOP_INTERVAL_MILES

        while remaining_miles > 0.1:  # Small epsilon to avoid floating point issues
            # Check if we need a cycle restart
            if cycle_hours_used >= CYCLE_LIMIT_HOURS:
                fraction = 1.0 - (remaining_miles / miles) if miles > 0 else 0
                loc = _interpolate_location(geometry, fraction)
                take_restart(loc)

            available_drive = get_remaining_drive_time()

            # If no drive time available, figure out what we need
            if available_drive <= 0:
                fraction = 1.0 - (remaining_miles / miles) if miles > 0 else 0
                loc = _interpolate_location(geometry, fraction)

                time_in_window = (clock - on_duty_window_start).total_seconds() / 3600

                if driving_in_shift >= MAX_DRIVING_HOURS or time_in_window >= MAX_DUTY_WINDOW_HOURS:
                    take_rest(loc, "10-hour mandatory rest (shift limit reached)")
                elif cycle_hours_used >= CYCLE_LIMIT_HOURS:
                    take_restart(loc)
                elif driving_since_break >= BREAK_REQUIRED_AFTER_HOURS:
                    take_break(loc)

                available_drive = get_remaining_drive_time()
                if available_drive <= 0:
                    # Shouldn't happen after rest, but safety net
                    take_rest(loc, "10-hour mandatory rest")
                    available_drive = get_remaining_drive_time()

            # Calculate how far we can drive in available time
            drivable_miles = available_drive * AVERAGE_SPEED_MPH

            # Check fuel stop
            miles_until_fuel = FUEL_STOP_INTERVAL_MILES - miles_since_fuel
            if miles_until_fuel <= 0:
                miles_until_fuel = FUEL_STOP_INTERVAL_MILES

            # Take the minimum chunk
            chunk_miles = min(remaining_miles, drivable_miles, miles_until_fuel)
            chunk_hours = chunk_miles / AVERAGE_SPEED_MPH

            if chunk_hours < 0.01:
                break  # Avoid infinite loops

            # Calculate location for this chunk
            start_fraction = 1.0 - (remaining_miles / miles) if miles > 0 else 0
            end_fraction = 1.0 - ((remaining_miles - chunk_miles) / miles) if miles > 0 else 1
            start_loc = _interpolate_location(geometry, start_fraction)
            end_loc = _interpolate_location(geometry, end_fraction)

            # Drive!
            add_segment(
                DutyStatus.DRIVING,
                chunk_hours,
                f'{leg_description} ({round(chunk_miles, 1)} mi)',
                end_loc,
                miles=chunk_miles,
            )

            # Update counters
            driving_since_break += chunk_hours
            driving_in_shift += chunk_hours
            cycle_hours_used += chunk_hours
            total_miles_driven += chunk_miles
            remaining_miles -= chunk_miles
            miles_since_fuel += chunk_miles

            # Check if we hit a fuel stop boundary
            if miles_since_fuel >= FUEL_STOP_INTERVAL_MILES and remaining_miles > 0.1:
                fuel_fraction = 1.0 - (remaining_miles / miles) if miles > 0 else 1
                fuel_loc = _interpolate_location(geometry, fuel_fraction)
                take_fuel_stop(fuel_loc)
                miles_since_fuel = 0

            # Check if break is needed before continuing
            if driving_since_break >= BREAK_REQUIRED_AFTER_HOURS and remaining_miles > 0.1:
                break_fraction = 1.0 - (remaining_miles / miles) if miles > 0 else 1
                break_loc = _interpolate_location(geometry, break_fraction)
                take_break(break_loc)

            # Check if shift limits hit
            time_in_window = (clock - on_duty_window_start).total_seconds() / 3600
            if (driving_in_shift >= MAX_DRIVING_HOURS or time_in_window >= MAX_DUTY_WINDOW_HOURS) and remaining_miles > 0.1:
                rest_fraction = 1.0 - (remaining_miles / miles) if miles > 0 else 1
                rest_loc = _interpolate_location(geometry, rest_fraction)
                take_rest(rest_loc, "10-hour mandatory rest (shift limit reached)")

    # ========================================
    # TRIP SIMULATION STARTS HERE
    # ========================================

    legs = route_data['legs']

    for leg in legs:
        leg_type = leg.get('type', 'driving')
        geometry = leg.get('geometry', [])
        distance = leg.get('distance_miles', 0)

        if leg_type == 'to_pickup':
            # Drive to pickup
            if distance > 0:
                drive_segment(distance, geometry, 'Driving to pickup')

            # Pickup activity (1 hour on-duty)
            pickup_loc = geometry[-1] if geometry else [0, 0]
            add_stop('pickup', 'Loading at pickup location', pickup_loc, PICKUP_DROPOFF_DURATION_HOURS)
            add_segment(DutyStatus.ON_DUTY, PICKUP_DROPOFF_DURATION_HOURS, 'Pickup / Loading', pickup_loc)
            cycle_hours_used += PICKUP_DROPOFF_DURATION_HOURS

        elif leg_type == 'to_dropoff':
            # Drive to dropoff
            if distance > 0:
                drive_segment(distance, geometry, 'Driving to dropoff')

            # Dropoff activity (1 hour on-duty)
            dropoff_loc = geometry[-1] if geometry else [0, 0]
            add_stop('dropoff', 'Unloading at dropoff location', dropoff_loc, PICKUP_DROPOFF_DURATION_HOURS)
            add_segment(DutyStatus.ON_DUTY, PICKUP_DROPOFF_DURATION_HOURS, 'Dropoff / Unloading', dropoff_loc)
            cycle_hours_used += PICKUP_DROPOFF_DURATION_HOURS

    # ========================================
    # GENERATE DAILY LOGS
    # ========================================
    daily_logs = _generate_daily_logs(timeline, start_time)

    # Calculate totals
    total_driving = sum(
        seg['duration_hours'] for seg in timeline if seg['status'] == int(DutyStatus.DRIVING)
    )
    total_trip_hours = (clock - start_time).total_seconds() / 3600

    return {
        'stops': stops,
        'daily_logs': daily_logs,
        'timeline': timeline,
        'total_driving_hours': round(total_driving, 2),
        'total_trip_hours': round(total_trip_hours, 2),
        'total_distance_miles': round(total_miles_driven, 1),
        'estimated_arrival': clock.isoformat(),
        'start_time': start_time.isoformat(),
        'current_cycle_hours_used': round(cycle_hours_used, 2),
    }


def _generate_daily_logs(timeline, trip_start):
    """
    Break the trip timeline into calendar-day log sheets.
    Each daily log contains segments for that day, with times relative to midnight.
    """
    if not timeline:
        return []

    # Find the date range
    first_time = datetime.fromisoformat(timeline[0]['start_time'])
    last_time = datetime.fromisoformat(timeline[-1]['end_time'])

    start_date = first_time.date()
    end_date = last_time.date()

    daily_logs = []
    current_date = start_date

    while current_date <= end_date:
        day_start = datetime.combine(current_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)

        day_segments = []
        day_miles = 0.0

        # Find the "from" and "to" locations for this day
        day_from = ""
        day_to = ""

        for seg in timeline:
            seg_start = datetime.fromisoformat(seg['start_time'])
            seg_end = datetime.fromisoformat(seg['end_time'])

            # Check if this segment overlaps with this day
            overlap_start = max(seg_start, day_start)
            overlap_end = min(seg_end, day_end)

            if overlap_start < overlap_end:
                # This segment has time in this day
                start_hour = (overlap_start - day_start).total_seconds() / 3600
                end_hour = (overlap_end - day_start).total_seconds() / 3600

                day_segments.append({
                    'status': seg['status'],
                    'status_name': seg['status_name'],
                    'start_hour': round(start_hour, 4),
                    'end_hour': round(end_hour, 4),
                    'duration_hours': round(end_hour - start_hour, 4),
                    'description': seg.get('description', ''),
                })

                # Track miles for driving segments
                if seg['status'] == int(DutyStatus.DRIVING):
                    # Proportional miles for the overlap
                    seg_total_hours = (seg_end - seg_start).total_seconds() / 3600
                    if seg_total_hours > 0:
                        overlap_hours = (overlap_end - overlap_start).total_seconds() / 3600
                        proportion = overlap_hours / seg_total_hours
                        day_miles += seg.get('miles', 0) * proportion

                # Track from/to
                if not day_from:
                    day_from = seg.get('description', '')
                day_to = seg.get('description', '')

        if day_segments:
            # Calculate totals per status
            totals = {
                'off_duty': 0, 'sleeper_berth': 0,
                'driving': 0, 'on_duty': 0,
            }

            for seg in day_segments:
                status = seg['status']
                hours = seg['duration_hours']
                if status == int(DutyStatus.OFF_DUTY):
                    totals['off_duty'] += hours
                elif status == int(DutyStatus.SLEEPER_BERTH):
                    totals['sleeper_berth'] += hours
                elif status == int(DutyStatus.DRIVING):
                    totals['driving'] += hours
                elif status == int(DutyStatus.ON_DUTY):
                    totals['on_duty'] += hours

            # Fill remaining hours with off-duty
            total_accounted = sum(totals.values())
            if total_accounted < 24:
                totals['off_duty'] += (24 - total_accounted)

                # Add off-duty segments for unaccounted time
                if day_segments:
                    first_seg_start = day_segments[0]['start_hour']
                    last_seg_end = day_segments[-1]['end_hour']

                    if first_seg_start > 0:
                        day_segments.insert(0, {
                            'status': int(DutyStatus.OFF_DUTY),
                            'status_name': 'Off Duty',
                            'start_hour': 0,
                            'end_hour': round(first_seg_start, 4),
                            'duration_hours': round(first_seg_start, 4),
                            'description': 'Off Duty',
                        })
                    if last_seg_end < 24:
                        day_segments.append({
                            'status': int(DutyStatus.OFF_DUTY),
                            'status_name': 'Off Duty',
                            'start_hour': round(last_seg_end, 4),
                            'end_hour': 24,
                            'duration_hours': round(24 - last_seg_end, 4),
                            'description': 'Off Duty',
                        })

            # Round totals
            for key in totals:
                totals[key] = round(totals[key], 2)

            daily_logs.append({
                'date': current_date.isoformat(),
                'day_number': (current_date - start_date).days + 1,
                'segments': day_segments,
                'total_miles': round(day_miles, 1),
                'totals': totals,
                'from_location': day_from,
                'to_location': day_to,
            })

        current_date += timedelta(days=1)

    return daily_logs
