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
- **Deployment**: Vercel (frontend) + Render (backend)

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenRouteService API key ([get one free](https://openrouteservice.org/dev/#/signup))

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
# Add your ORS API key to .env
echo "ORS_API_KEY=your_key_here" >> .env
python manage.py migrate
python manage.py runserver 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

#### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
ORS_API_KEY=your-openrouteservice-api-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## Deployment

### Frontend (Vercel)
1. Push `frontend/` to GitHub
2. Import into Vercel
3. Set `VITE_API_URL` environment variable to your backend URL

### Backend (Render)
1. Push `backend/` to GitHub
2. Create a Web Service on Render
3. Set environment variables: `SECRET_KEY`, `ORS_API_KEY`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`

## License

MIT
