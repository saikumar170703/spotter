import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geocodeAddress } from '../api/tripApi';
import './TripForm.css';

function AddressInput({ id, label, value, onChange, icon, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    setSelectedCoords(null);
    onChange(val, null);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (val.length >= 3) {
      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await geocodeAddress(val);
          setSuggestions(results || []);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChange]);

  const handleSelect = useCallback((suggestion) => {
    setInputValue(suggestion.label);
    setSelectedCoords([suggestion.lng, suggestion.lat]);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(suggestion.label, [suggestion.lng, suggestion.lat]);
  }, [onChange]);

  return (
    <div className="form-group address-input-group" ref={wrapperRef}>
      <label className="form-label" htmlFor={id}>
        <span className="label-icon">{icon}</span>
        {label}
      </label>
      <div className="input-wrapper">
        <input
          id={id}
          type="text"
          className={`form-input ${selectedCoords ? 'input-validated' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {selectedCoords && (
          <span className="input-check" title="Location verified">✓</span>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s, i) => (
            <li key={i} className="suggestion-item" onClick={() => handleSelect(s)}>
              <span className="suggestion-icon">📍</span>
              <span className="suggestion-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TripForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: 0,
    current_coords: null,
    pickup_coords: null,
    dropoff_coords: null,
  });
  const [error, setError] = useState('');

  const handleAddressChange = (field, coordField) => (value, coords) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      [coordField]: coords,
    }));
    setError('');
  };

  const handleCycleChange = (e) => {
    const val = Math.min(70, Math.max(0, parseFloat(e.target.value) || 0));
    setFormData(prev => ({ ...prev, current_cycle_hours: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.current_location.trim()) {
      setError('Please enter your current location');
      return;
    }
    if (!formData.pickup_location.trim()) {
      setError('Please enter the pickup location');
      return;
    }
    if (!formData.dropoff_location.trim()) {
      setError('Please enter the dropoff location');
      return;
    }

    const payload = {
      current_location: formData.current_location,
      pickup_location: formData.pickup_location,
      dropoff_location: formData.dropoff_location,
      current_cycle_hours: formData.current_cycle_hours,
    };
    if (formData.current_coords) payload.current_coords = formData.current_coords;
    if (formData.pickup_coords) payload.pickup_coords = formData.pickup_coords;
    if (formData.dropoff_coords) payload.dropoff_coords = formData.dropoff_coords;

    onSubmit(payload);
  };

  const cyclePercent = (formData.current_cycle_hours / 70) * 100;

  return (
    <form className="trip-form glass-card animate-slide-left" onSubmit={handleSubmit} id="trip-form">
      <div className="form-header">
        <h2 className="form-title">Plan Your Trip</h2>
        <p className="form-subtitle">Enter trip details to generate HOS-compliant route & ELD logs</p>
      </div>

      <div className="form-body">
        <div className="route-line">
          <div className="route-dots">
            <span className="dot dot-current"></span>
            <span className="dot-line"></span>
            <span className="dot dot-pickup"></span>
            <span className="dot-line"></span>
            <span className="dot dot-dropoff"></span>
          </div>
          <div className="route-fields">
            <AddressInput
              id="current-location"
              label="Current Location"
              value={formData.current_location}
              onChange={handleAddressChange('current_location', 'current_coords')}
              icon="📍"
              placeholder="e.g. Chicago, IL"
            />
            <AddressInput
              id="pickup-location"
              label="Pickup Location"
              value={formData.pickup_location}
              onChange={handleAddressChange('pickup_location', 'pickup_coords')}
              icon="📦"
              placeholder="e.g. Dallas, TX"
            />
            <AddressInput
              id="dropoff-location"
              label="Dropoff Location"
              value={formData.dropoff_location}
              onChange={handleAddressChange('dropoff_location', 'dropoff_coords')}
              icon="🏁"
              placeholder="e.g. Los Angeles, CA"
            />
          </div>
        </div>

        <div className="form-group cycle-group">
          <label className="form-label" htmlFor="cycle-hours">
            <span className="label-icon">⏱️</span>
            Current Cycle Used
          </label>
          <div className="cycle-input-row">
            <input
              id="cycle-hours"
              type="number"
              className="form-input cycle-input"
              value={formData.current_cycle_hours}
              onChange={handleCycleChange}
              min="0"
              max="70"
              step="0.5"
            />
            <span className="cycle-unit">hrs / 70</span>
          </div>
          <div className="cycle-bar">
            <div
              className="cycle-bar-fill"
              style={{
                width: `${cyclePercent}%`,
                background: cyclePercent > 80 ? 'var(--accent-red)' : cyclePercent > 60 ? 'var(--accent-orange)' : 'var(--accent-green)',
              }}
            ></div>
          </div>
          <div className="cycle-labels">
            <span>{formData.current_cycle_hours}h used</span>
            <span>{(70 - formData.current_cycle_hours).toFixed(1)}h remaining</span>
          </div>
        </div>

        {error && (
          <div className="form-error animate-in">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-lg btn-full"
          disabled={isLoading}
          id="calculate-btn"
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Calculating Route...
            </>
          ) : (
            <>
              <span>🗺️</span>
              Calculate Trip Plan
            </>
          )}
        </button>
      </div>

      <div className="form-footer">
        <div className="assumptions-list">
          <span className="assumptions-title">Assumptions:</span>
          <span>Property carrier</span>
          <span>•</span>
          <span>70hr/8day cycle</span>
          <span>•</span>
          <span>Fuel every 1,000mi</span>
        </div>
      </div>
    </form>
  );
}
