import React, { useState } from 'react';
import './TripSummary.css';

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true,
  });
}

const STOP_CONFIG = {
  pickup: { icon: '📦', color: 'orange', label: 'Pickup' },
  dropoff: { icon: '🏁', color: 'green', label: 'Dropoff' },
  rest: { icon: '🛏️', color: 'purple', label: 'Rest Stop' },
  fuel: { icon: '⛽', color: 'yellow', label: 'Fuel Stop' },
  break: { icon: '☕', color: 'blue', label: 'Break' },
  restart: { icon: '🔄', color: 'red', label: 'Cycle Restart' },
};

export default function TripSummary({ tripData }) {
  const [activeTab, setActiveTab] = useState('stops');

  if (!tripData) return null;

  const plan = tripData.trip_plan;
  const route = tripData.route;
  const stops = plan?.stops || [];
  const legs = route?.legs || [];

  return (
    <div className="trip-summary glass-card animate-slide-up" id="trip-summary">
      <div className="summary-header">
        <h3 className="summary-title">Trip Summary</h3>
        <div className="summary-stats-row">
          <div className="summary-stat">
            <span className="summary-stat-value">{route?.total_distance_miles?.toLocaleString()}</span>
            <span className="summary-stat-label">Total Miles</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{formatDuration(plan?.total_driving_hours || 0)}</span>
            <span className="summary-stat-label">Driving Time</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{formatDuration(plan?.total_trip_hours || 0)}</span>
            <span className="summary-stat-label">Total Trip</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{plan?.daily_logs?.length || 0}</span>
            <span className="summary-stat-label">Days</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{stops.length}</span>
            <span className="summary-stat-label">Stops</span>
          </div>
        </div>
        <div className="summary-arrival">
          <span className="arrival-label">Estimated Arrival:</span>
          <span className="arrival-time">{formatTime(plan?.estimated_arrival)}</span>
        </div>
      </div>

      <div className="summary-tabs">
        <button
          className={`tab-btn ${activeTab === 'stops' ? 'active' : ''}`}
          onClick={() => setActiveTab('stops')}
        >
          Stops & Rests
        </button>
        <button
          className={`tab-btn ${activeTab === 'directions' ? 'active' : ''}`}
          onClick={() => setActiveTab('directions')}
        >
          Route Directions
        </button>
      </div>

      <div className="summary-content">
        {activeTab === 'stops' && (
          <div className="stops-timeline">
            {/* Start */}
            <div className="timeline-item">
              <div className="timeline-marker" style={{ background: '#3b82f6' }}>
                <span>🚛</span>
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Trip Start</div>
                <div className="timeline-detail">{tripData.locations?.current?.label}</div>
                <div className="timeline-time">{formatTime(plan?.start_time)}</div>
              </div>
            </div>

            {stops.map((stop, i) => {
              const config = STOP_CONFIG[stop.type] || STOP_CONFIG.break;
              return (
                <div key={i} className="timeline-item">
                  <div className={`timeline-marker marker-${config.color}`}>
                    <span>{config.icon}</span>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">{config.label}</span>
                      <span className={`badge badge-${config.color}`}>
                        {formatDuration(stop.duration_hours)}
                      </span>
                    </div>
                    <div className="timeline-detail">{stop.description}</div>
                    <div className="timeline-time">{formatTime(stop.start_time)}</div>
                  </div>
                </div>
              );
            })}

            {/* End */}
            <div className="timeline-item">
              <div className="timeline-marker" style={{ background: '#10b981' }}>
                <span>✅</span>
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Trip Complete</div>
                <div className="timeline-detail">{tripData.locations?.dropoff?.label}</div>
                <div className="timeline-time">{formatTime(plan?.estimated_arrival)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'directions' && (
          <div className="directions-list">
            {legs.map((leg, li) => (
              <div key={li} className="directions-leg">
                <div className="leg-header">
                  <span className={`badge ${leg.type === 'to_pickup' ? 'badge-blue' : 'badge-orange'}`}>
                    {leg.type === 'to_pickup' ? 'To Pickup' : 'To Dropoff'}
                  </span>
                  <span className="leg-meta">
                    {leg.distance_miles?.toLocaleString()} mi • {formatDuration(leg.duration_hours)}
                  </span>
                </div>
                <ol className="steps-list">
                  {(leg.steps || []).map((step, si) => (
                    <li key={si} className="step-item">
                      <span className="step-instruction">{step.instruction}</span>
                      <span className="step-meta">
                        {step.distance_miles > 0 ? `${step.distance_miles} mi` : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
