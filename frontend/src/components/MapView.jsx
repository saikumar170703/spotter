import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons using DivIcon
function createIcon(emoji, color, size = 32) {
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ">
      <span style="transform: rotate(45deg); font-size: ${size * 0.45}px; line-height: 1;">${emoji}</span>
    </div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const ICONS = {
  current: createIcon('📍', '#3b82f6', 36),
  pickup: createIcon('📦', '#f97316', 36),
  dropoff: createIcon('🏁', '#10b981', 36),
  rest: createIcon('🛏️', '#8b5cf6', 28),
  fuel: createIcon('⛽', '#eab308', 28),
  break: createIcon('☕', '#06b6d4', 28),
  restart: createIcon('🔄', '#ef4444', 28),
};

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [bounds, map]);
  return null;
}

export default function MapView({ tripData }) {
  const defaultCenter = [39.8283, -98.5795]; // Center of US
  const defaultZoom = 4;

  const { markers, routeGeometry, bounds, stops } = useMemo(() => {
    if (!tripData) return { markers: [], routeGeometry: [], bounds: null, stops: [] };

    const m = [];
    const locs = tripData.locations;

    // Main location markers
    if (locs?.current) {
      m.push({ position: locs.current.coords, icon: ICONS.current, label: locs.current.label, type: 'Start Location' });
    }
    if (locs?.pickup) {
      m.push({ position: locs.pickup.coords, icon: ICONS.pickup, label: locs.pickup.label, type: 'Pickup Location' });
    }
    if (locs?.dropoff) {
      m.push({ position: locs.dropoff.coords, icon: ICONS.dropoff, label: locs.dropoff.label, type: 'Dropoff Location' });
    }

    // Stop markers from trip plan
    const tripStops = tripData.trip_plan?.stops || [];
    const st = [];
    tripStops.forEach((stop, i) => {
      if (stop.location && Array.isArray(stop.location) && stop.type !== 'pickup' && stop.type !== 'dropoff') {
        const iconKey = stop.type || 'break';
        const icon = ICONS[iconKey] || ICONS.break;
        m.push({
          position: stop.location,
          icon,
          label: stop.description,
          type: stop.type,
          duration: stop.duration_hours,
          time: stop.start_time,
        });
        st.push(stop);
      }
    });

    // Route geometry
    const geo = tripData.route?.full_geometry || [];

    // Calculate bounds
    const allPoints = [...geo];
    m.forEach(mk => {
      if (mk.position) allPoints.push(mk.position);
    });

    const b = allPoints.length > 0
      ? allPoints.map(p => [p[0], p[1]])
      : null;

    return { markers: m, routeGeometry: geo, bounds: b, stops: st };
  }, [tripData]);

  // Separate geometries for the two legs for different colors
  const leg1Geo = tripData?.route?.legs?.[0]?.geometry || [];
  const leg2Geo = tripData?.route?.legs?.[1]?.geometry || [];

  return (
    <div className="map-container" id="map-container">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="map-view"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {bounds && <FitBounds bounds={bounds} />}

        {/* Route polylines */}
        {leg1Geo.length > 0 && (
          <Polyline
            positions={leg1Geo}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
              dashArray: null,
            }}
          />
        )}
        {leg2Geo.length > 0 && (
          <Polyline
            positions={leg2Geo}
            pathOptions={{
              color: '#f97316',
              weight: 4,
              opacity: 0.8,
              dashArray: null,
            }}
          />
        )}

        {/* Markers */}
        {markers.map((marker, i) => (
          <Marker key={i} position={marker.position} icon={marker.icon}>
            <Popup>
              <div className="marker-popup">
                <strong className="popup-type">{marker.type}</strong>
                <span className="popup-label">{marker.label}</span>
                {marker.duration && (
                  <span className="popup-duration">
                    Duration: {formatDuration(marker.duration)}
                  </span>
                )}
                {marker.time && (
                  <span className="popup-time">
                    {new Date(marker.time).toLocaleString()}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map legend */}
      {tripData && (
        <div className="map-legend animate-in">
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#3b82f6' }}></span>
            <span>To Pickup</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#f97316' }}></span>
            <span>To Dropoff</span>
          </div>
          <div className="legend-item"><span>📦</span> Pickup</div>
          <div className="legend-item"><span>🏁</span> Dropoff</div>
          <div className="legend-item"><span>🛏️</span> Rest</div>
          <div className="legend-item"><span>⛽</span> Fuel</div>
          <div className="legend-item"><span>☕</span> Break</div>
        </div>
      )}

      {/* Quick stats overlay */}
      {tripData && (
        <div className="map-stats animate-slide-up">
          <div className="stat-pill">
            <span className="stat-value">{tripData.route?.total_distance_miles?.toLocaleString()}</span>
            <span className="stat-label">miles</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{formatDuration(tripData.trip_plan?.total_driving_hours || 0)}</span>
            <span className="stat-label">driving</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{formatDuration(tripData.trip_plan?.total_trip_hours || 0)}</span>
            <span className="stat-label">total trip</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{tripData.trip_plan?.daily_logs?.length || 0}</span>
            <span className="stat-label">days</span>
          </div>
        </div>
      )}
    </div>
  );
}
