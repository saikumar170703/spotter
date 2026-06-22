import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import TripForm from './components/TripForm';
import MapView from './components/MapView';
import TripSummary from './components/TripSummary';
import LogSheetCarousel from './components/LogSheetCarousel';
import { calculateTrip } from './api/tripApi';
import './App.css';

function App() {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (formData) => {
    setIsLoading(true);
    setError('');
    setTripData(null);

    try {
      const result = await calculateTrip(formData);
      setTripData(result);

      // Scroll to map after results load
      setTimeout(() => {
        document.getElementById('map-container')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 300);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to calculate trip. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="app" id="app-root">
      <Header />

      <main className="app-main">
        {/* Top section: Form + Map side by side */}
        <section className="top-section">
          <div className="sidebar-col">
            <TripForm onSubmit={handleSubmit} isLoading={isLoading} />

            {error && (
              <div className="global-error glass-card animate-in">
                <div className="error-icon">⚠️</div>
                <div className="error-content">
                  <strong>Error</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          <div className="map-col">
            <MapView tripData={tripData} />
          </div>
        </section>

        {/* Results section */}
        {tripData && (
          <section className="results-section animate-slide-up">
            <div className="results-grid">
              <TripSummary tripData={tripData} />
            </div>

            {/* ELD Logs */}
            {tripData.trip_plan?.daily_logs?.length > 0 && (
              <div className="logs-section">
                <LogSheetCarousel dailyLogs={tripData.trip_plan.daily_logs} />
              </div>
            )}
          </section>
        )}

        {/* Empty state when no trip data */}
        {!tripData && !isLoading && (
          <section className="empty-state animate-in">
            <div className="empty-state-content">
              <div className="empty-icon">🗺️</div>
              <h3>Plan Your ELD-Compliant Trip</h3>
              <p>
                Enter your current location, pickup and dropoff points, and current
                cycle hours to generate a HOS-compliant route with filled-out
                daily log sheets.
              </p>
              <div className="feature-pills">
                <span className="feature-pill">📍 Route Planning</span>
                <span className="feature-pill">⏱️ HOS Compliance</span>
                <span className="feature-pill">📋 ELD Log Sheets</span>
                <span className="feature-pill">⛽ Fuel Stops</span>
                <span className="feature-pill">🛏️ Rest Scheduling</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>SpotterELD Trip Planner • HOS Compliant • FMCSA Property-Carrying Rules • 70hr/8day Cycle</p>
      </footer>
    </div>
  );
}

export default App;
