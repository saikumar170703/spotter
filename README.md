# SpotterELD — Trip Planner & ELD Log Generator

A full-stack Django + React application that plans HOS-compliant truck trips and generates ELD (Electronic Logging Device) daily log sheets.

## Features

- **Trip Planning**: Enter current location, pickup, and dropoff to get an optimal route
- **HOS Compliance**: Automatic scheduling of mandatory breaks, rest stops, and fuel stops per FMCSA rules
- **Interactive Map**: Dark-themed Leaflet map showing route, stops, and markers
- **ELD Daily Logs**: Canvas-rendered FMCSA-format daily log sheets for each day of the trip
- **Route Directions**: Turn-by-turn driving instructions

## HOS Rules Implemented

| Rule | Limit |
|------|-------|
| Driving Limit | 11 hours per shift |
| On-Duty Window | 14 hours from shift start |
| Mandatory Break | 30 min after 8 hours driving |
| Off-Duty Rest | 10 hours between shifts |
| Cycle Limit | 70 hours / 8 days |
| Cycle Restart | 34-hour full restart |
| Fueling | Every 1,000 miles (30 min) |
| Pickup/Dropoff | 1 hour each (On-Duty) |

## Tech Stack

- **Backend**: Django 4.2+, Django REST Framework
- **Frontend**: React (Vite), Leaflet, HTML5 Canvas
- **Map API**: OpenRouteService (free tier)
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenRouteService API key ([get one free](https://openrouteservice.org/dev/#/signup))

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

python manage.py migrate
python manage.py runserver 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```






