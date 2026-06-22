/**
 * API client for the ELD Trip Planner backend.
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for long route calculations
});

/**
 * Calculate a trip plan with HOS-compliant stops and ELD logs.
 */
export async function calculateTrip(data) {
  const response = await api.post('/trip/calculate/', data);
  return response.data;
}

/**
 * Geocode an address for autocomplete suggestions.
 */
export async function geocodeAddress(query) {
  const response = await api.get('/trip/geocode/', {
    params: { q: query },
  });
  return response.data.results;
}

/**
 * Health check.
 */
export async function healthCheck() {
  const response = await api.get('/health/');
  return response.data;
}

export default api;
