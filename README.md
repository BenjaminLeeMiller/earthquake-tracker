# Earthquake Tracker

An interactive 3D globe visualizing global earthquake activity, fault lines,
and volcano locations, with time-range filtering and a time-lapse replay
mode.

## Features

- **3D globe** (React Three Fiber / Three.js) with a real map texture,
  toggleable translucent/opaque rendering, and orbit/zoom controls.
- **Earthquake markers** colored and sized by magnitude, with per-quake
  depth positioning.
- **Fault-line overlay** showing tectonic plate boundaries.
- **Volcano markers** for the world's Holocene volcanoes, scaled to a
  constant on-screen size regardless of zoom, with click-through details
  (type, elevation, last eruption, tectonic setting).
- **Time range** and **magnitude range** filters (collapsible sidebar
  controls) applied live to the globe. Time range can be set by dragging
  the From/To sliders or by typing an exact date and time into the
  accompanying date/time inputs — handy for narrowing in on a specific
  window.
- **Time-lapse replay** — sweeps the selected time range, revealing quakes
  as the clock passes their occurrence time and fading them out. Default
  playback speed auto-scales to sweep the selected range in ~30 seconds
  (clamped to a sane min/max), with a manual log-scale override slider and
  per-time-slice quake-count / max-magnitude histograms (with a moving
  progress line) shown under the controls.
- **P-wave propagation rings** — during replay, each earthquake's
  compression wave expands outward from its epicenter at realistic
  wave-speed, attenuating below a measurable intensity per real seismology
  (MMI attenuation). Only shown when the selected time range is narrow
  enough (~30 minutes or less) that replay runs slowly enough for the
  wave's real-world speed to be visible.
- **Manual refresh** button to pull the latest data from USGS on demand, in
  addition to an automatic hourly refresh.

## Data sources

| Layer | Source | Notes |
|---|---|---|
| **Earthquakes** | [USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/) (FDSN event web service) | Backend does an initial 30-day backfill on first run, then refreshes hourly (25-hour overlap window to catch late revisions). A manual "Refresh from USGS" button in the UI triggers an on-demand fetch. |
| **Volcanoes** | [Smithsonian Institution Global Volcanism Program](https://volcano.si.edu/) — Volcanoes of the World (VOTW) database, Holocene volcano list, via their [GeoServer WFS](https://webservices.volcano.si.edu/geoserver/web/) | Static dataset (1,215 volcanoes worldwide), fetched once and bundled as `frontend/src/assets/volcanoes.json` — no live backend ingestion, since volcano locations rarely change. |
| **Fault lines** | Bird (2002) plate boundaries, via [github.com/fraxen/tectonicplates](https://github.com/fraxen/tectonicplates) | Static dataset, trimmed to coordinate arrays and bundled as `frontend/src/assets/plate-boundaries.json`. |

## Tech stack

**Backend** — FastAPI, SQLAlchemy (async) + PostgreSQL, APScheduler for the
hourly refresh job, httpx for the USGS client.

**Frontend** — React + TypeScript, Vite, react-three-fiber / drei / three.js
for the globe, Zustand for state.

## Project structure

```
backend/
  app/
    api/          # FastAPI routers (earthquakes, globe stats/cells)
    models/        # SQLAlchemy models
    schemas/       # Pydantic response schemas
    services/      # USGS client, ingestion, grid/cell aggregation
    tasks/         # APScheduler hourly refresh job
frontend/
  src/
    components/
      Globe/       # Canvas, EarthSphere, EarthquakeLayer, FaultLines, VolcanoLayer, SeismicWaveLayer
      Controls/    # Sidebar filter/toggle controls
      Sidebar/     # Stats panel, detail panels, shared layout primitives
    store/         # Zustand app state
    api/           # Backend API client
    assets/        # Bundled static datasets (plate boundaries, volcanoes)
```

## Running locally

Requires Docker and Docker Compose.

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (docs at `/docs`)
- Postgres: exposed on `localhost:5433`

On first run, the backend creates its tables and backfills 30 days of
earthquake data before the frontend has anything to show — check
`docker compose logs backend` if the globe looks empty.

## Configuration

Environment variables (see `.env.example`), read by the backend from `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://eq_user:eq_pass@localhost:5432/earthquake_db` | Postgres connection string |
| `USGS_BASE_URL` | `https://earthquake.usgs.gov/fdsnws/event/1/query` | USGS FDSN event endpoint |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | Allowed frontend origins |
| `FETCH_WINDOW_DAYS` | `30` | Initial backfill window |
| `REFRESH_OVERLAP_HOURS` | `25` | Hourly refresh look-back window |
| `LOG_LEVEL` | `INFO` | Backend log level |

## Development

**Tests** — `cd backend && pytest` (needs a Postgres instance; see
`backend/tests/conftest.py`) / `cd frontend && npm test`.

**Linting and formatting** — Ruff (backend), ESLint + Prettier (frontend):

```bash
cd backend && ruff check . && ruff format --check .
cd frontend && npm run lint && npm run format:check
```

Both are enforced in CI (`.github/workflows/backend-tests.yml`,
`frontend-tests.yml`) and via a git pre-commit hook. To enable the hook
locally, one-time setup:

```bash
pip install pre-commit
pre-commit install
```

## API

All routes are prefixed with `/api`:

- `GET /earthquakes` — paginated earthquake list, filterable by `min_mag`
- `POST /earthquakes/refresh` — trigger a manual USGS refresh (background task)
- `GET /globe/earthquakes` — full unpaginated earthquake list, for the globe
- `GET /globe/cells?depth_layer=` — spatially-binned cell aggregates
- `GET /globe/stats` — total count, date range, active layers, last-refreshed time
- `GET /cells/{layer}/{lat_band}/{lon_index}` — earthquakes within one grid cell
- `GET /health` — health check

## License

Licensed under the [GNU General Public License v3.0](LICENSE) or later.
