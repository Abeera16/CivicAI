# CivicAI — Lahore Urban Intelligence Platform

Citizens report urban issues (potholes, flooding, waste, streetlights). An AI pipeline classifies each report, groups them into incidents, scores real-world impact, and gives city staff a live command center to act on.

**Three surfaces:** Web (Next.js) · Android (Jetpack Compose) · REST API (FastAPI)

---

## Stack

| | |
|---|---|
| Backend | FastAPI, SQLAlchemy async, PostgreSQL, LangChain, LangGraph, Groq |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Leaflet (OpenStreetMap) |
| Android | Kotlin, Jetpack Compose, Retrofit 2, OSMDroid, DataStore |
| Infra | Docker Compose (Postgres + backend + frontend) |

---

## Prerequisites

- Docker Desktop
- A free [Groq API key](https://console.groq.com/keys)
- A free [OpenWeatherMap API key](https://openweathermap.org/api)
- Android Studio (for the Android app only)

---

## Running locally

```bash
cp .env.example .env
# Fill in GROQ_API_KEY, OPENWEATHERMAP_API_KEY, JWT_SECRET_KEY
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3001 |
| API + Swagger | http://localhost:8000/docs |

After first boot, sync OSM road/facility data (needed for the impact engine):
```bash
curl -X POST http://localhost:8000/api/osm/sync
```

**Demo admin account** — set these in `.env` and the backend seeds it automatically on startup:
```
SEED_ADMIN_EMAIL=admin@civicai.app
SEED_ADMIN_PASSWORD=ChangeMe123!
```

---

## Android app

```bash
cp CivicAI/local.properties.example CivicAI/local.properties
```

Edit `CivicAI/local.properties`:
```properties
sdk.dir=/path/to/your/Android/sdk
CIVICAI_BASE_URL=http://10.0.2.2:8000/api/   # emulator
# CIVICAI_BASE_URL=http://192.168.x.x:8000/api/  # physical device
```

Open `CivicAI/` in Android Studio and run on API 24+ emulator or device.

**Screens:** Welcome · Sign In / Register · Home (incident feed) · Nearby (map) · Report a Problem · My Reports · Alerts · Ask CivicAI (chat) · Incident Detail · Command Center (staff only)

---

## How it works

```
POST /reports (photo + GPS)
  ├── LLM classifies → category, severity, department
  ├── Haversine dedup → merge into existing incident or create new
  │     same category: 80m · cross-category: 150m
  └── Impact score (0–100) →
        severity 35% · report count 20% · road proximity 20%
        facility proximity 15% · recurrence 10%
        (+15% flood multiplier when active rainfall)

POST /assistant/chat
  supervisor → retrieval (MCP tools) → citation synthesis → response
```

---

## Deployment

| Service | Provider |
|---|---|
| PostgreSQL | [Neon](https://neon.tech) free tier |
| Backend | [Render](https://render.com) free Web Service |
| Frontend | [Vercel](https://vercel.com) free tier |

**Render** — root dir: `backend`, build: `pip install -r requirements.txt`, start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Vercel** — root dir: `frontend`, add env var: `NEXT_PUBLIC_CIVICAI_API_URL=https://your-backend.onrender.com/api`

**Android** — update `CIVICAI_BASE_URL` in `local.properties` to your Render HTTPS URL and rebuild.

---

## Environment variables

See `.env.example` for the full list. Required ones:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your Postgres connection string |
| `GROQ_API_KEY` | console.groq.com (free) |
| `OPENWEATHERMAP_API_KEY` | openweathermap.org (free) |
| `JWT_SECRET_KEY` | Any random 40-char string |
