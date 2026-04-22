# Server — FastAPI Backend

The central nervous system of Exo-Platform. Manages Raspberry Pi connections, dispatches commands, streams video, persists telemetry, and serves the HTTP API consumed by the frontend.

---

## What It Does

- Accepts TCP connections from Raspberry Pi agents on 3 channels (control, video, telemetry)
- Exposes a REST + WebSocket API on HTTP port 5000
- Persists telemetry, commands, and recordings to SQLite
- Handles JWT-based authentication for researchers
- Serves OpenAPI docs at `/docs` (auto-generated)

---

## Requirements

- **Python 3.10+**
- **Dependencies** (listed in `requirements.txt`):
  - `fastapi>=0.110.0`
  - `uvicorn>=0.29.0`
  - `pydantic>=2.0.0`

---

## Setup

### 1. Create a virtual environment (recommended)

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment (optional)

Copy the example environment file and edit as needed:

```bash
cp .env.example .env
```

### 4. Run the server

```bash
python3 app.py
```

Or with `uvicorn` directly (enables auto-reload for development):

```bash
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

You should see:

```
Exo-Platform Server starting on http://0.0.0.0:5000
  Control port: 1863
  Video port:   8612
  Telemetry:    8613
  Database:     /path/to/exo_data.db
ConnectionManager listening on control=1863, video=8612, telemetry=8613
```

---

## Environment Variables

All configuration is driven by environment variables (or defaults). See `.env.example` for a complete template.

### Network

| Variable | Default | Description |
|----------|---------|-------------|
| `EXO_HOST` | `0.0.0.0` | Bind address for TCP listeners |
| `EXO_HTTP_PORT` | `5000` | FastAPI HTTP port |
| `EXO_CONTROL_PORT` | `1863` | TCP port for Pi control channel |
| `EXO_VIDEO_PORT` | `8612` | TCP port for Pi video streaming |
| `EXO_TELEMETRY_PORT` | `8613` | TCP port for Pi telemetry |

### Protocol

| Variable | Default | Description |
|----------|---------|-------------|
| `EXO_HEARTBEAT_INTERVAL_S` | `5` | Heartbeat send interval (Pi side) |
| `EXO_HEARTBEAT_TIMEOUT_S` | `20` | Drop session after N seconds without heartbeat |
| `EXO_VIDEO_STREAM_FPS` | `15` | MJPEG stream rate to browser |
| `EXO_MAX_FRAME_BYTES` | `4000000` | Max JPEG frame size (bytes) |
| `EXO_MAX_CONTROL_LINE_BYTES` | `65536` | Max JSON message size (bytes) |

### Database & Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `EXO_DATABASE_PATH` | `./exo_data.db` | SQLite file path |
| `EXO_JWT_SECRET` | `exo-platform-dev-secret-change-in-production` | HMAC key for JWT signing |
| `EXO_JWT_EXPIRE_MINUTES` | `480` | Token lifetime (8 hours default) |
| `EXO_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated allowed origins |
| `EXO_RECORDINGS_DIR` | `./recordings` | Directory for video recordings |

---

## API Endpoints

Auto-generated OpenAPI docs available at **http://localhost:5000/docs** (Swagger UI) or **/redoc**.

### Health

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check (server status, client count) |
| `GET` | `/api/status` | Detailed status (server info, all clients, ports) |

### Clients (Pi Agents)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/clients` | List all connected Pis with device manifests |
| `GET` | `/api/clients/{client_id}` | Get single Pi details |
| `GET` | `/api/clients/{client_id}/devices` | Get device manifest for a Pi |

### Commands

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/clients/{client_id}/command` | Send raw command to Pi |
| `POST` | `/api/clients/{client_id}/devices/{device_type}/command` | Send device-specific command |
| `GET` | `/api/commands/{msg_id}` | Get command status (ack, result) |
| `GET` | `/api/clients/{client_id}/commands` | Command history for a Pi |

### Video

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/clients/{client_id}/video` | MJPEG stream (browser consumes via `<img>`) |
| `GET` | `/api/clients/{client_id}/video/snapshot` | Single JPEG frame |

### Telemetry

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/clients/{client_id}/telemetry` | Latest telemetry packet |
| `GET` | `/api/clients/{client_id}/telemetry/history` | Historical telemetry from SQLite |
| `WS` | `/api/clients/{client_id}/telemetry/ws` | Real-time telemetry push (10Hz) |

### Auth

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Returns JWT token |
| `POST` | `/api/auth/register` | Create a new user (admin only in production) |
| `GET` | `/api/auth/users` | List users |

---

## Default Admin User

On first startup, the server auto-creates an admin user:

- **Username:** `admin`
- **Password:** `admin`

> **Change this immediately** in production. Either log in via `POST /api/auth/login` and update, or delete `exo_data.db` and set `EXO_ADMIN_PASSWORD` env var before first start.

### Login Example

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

Returns:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "admin",
  "role": "admin"
}
```

### Using the Token

```bash
curl http://localhost:5000/api/clients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Database

SQLite file at `$EXO_DATABASE_PATH` (default: `./exo_data.db`). Auto-created on first run with schema from `db.py`.

### Tables

- `users` — Authentication records
- `telemetry` — Time-series sensor data (one row per sensor per packet)
- `command_log` — Every command sent, with ack/result tracking
- `recordings` — Video recording metadata (file paths, durations)

### Inspecting the Database

```bash
sqlite3 exo_data.db

sqlite> .tables
sqlite> .schema telemetry
sqlite> SELECT client_id, sensor_name, value, datetime(timestamp, 'unixepoch') FROM telemetry ORDER BY timestamp DESC LIMIT 10;
sqlite> SELECT client_id, command, result_status FROM command_log ORDER BY sent_at DESC LIMIT 10;
```

### Backup

```bash
sqlite3 exo_data.db ".backup backup_$(date +%Y%m%d).db"
```

---

## Developer Guide

### File Structure

```
server/
├── app.py                  FastAPI app + startup/shutdown
├── config.py               Environment variable parsing
├── db.py                   SQLite schema and CRUD helpers
├── requirements.txt        Python dependencies
│
├── comm/
│   ├── __init__.py
│   └── manager.py          ConnectionManager — the heart of Pi orchestration
│
├── routes/
│   ├── __init__.py
│   ├── clients.py          GET /clients — list connected Pis
│   ├── commands.py         POST /clients/{id}/command — dispatch to Pi
│   ├── video.py            GET /clients/{id}/video — MJPEG streaming
│   ├── telemetry.py        REST + WebSocket for sensor data
│   └── auth.py             Login, register, users
│
└── auth/
    └── __init__.py         Password hashing (PBKDF2) + JWT
```

### Adding a New Route

1. Create `routes/myroute.py`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/myroute", tags=["myroute"])

@router.get("/")
def get_something():
    return {"hello": "world"}
```

2. Wire it up in `app.py`:

```python
from routes import clients, commands, video, telemetry, auth, myroute
app.include_router(myroute.router)
```

### Extending ConnectionManager

The `ConnectionManager` class (in `comm/manager.py`) is the central orchestrator. To add a new channel (e.g., audio streaming):

1. Add a new port to `config.py`
2. Create a new listener in `ensure_started()`
3. Add an accept loop and reader loop following the pattern of `_accept_video_loop` / `_video_reader_loop`
4. Expose state via a new method on the manager
5. Surface it through a route

### Adding a Callback on Telemetry

`app.py` demonstrates the pattern:

```python
def _on_telemetry(client_id: str, data: dict):
    db.save_telemetry_batch(client_id, data.get("readings", data), data.get("timestamp"))

connection_manager.on_telemetry = _on_telemetry
```

You can add more callbacks like `on_command_result`, `on_client_connect`, `on_client_disconnect` following the same pattern.

---

## Troubleshooting

### Port already in use

```
OSError: [Errno 48] Address already in use
```

Find and kill the conflicting process:

```bash
lsof -i :5000
kill -9 <PID>
```

Or change ports in `.env`:

```
EXO_HTTP_PORT=5001
EXO_CONTROL_PORT=1864
```

### CORS errors in browser

Console shows `"CORS policy: No 'Access-Control-Allow-Origin' header"`.

Ensure your frontend origin is in `EXO_CORS_ORIGINS`:

```bash
EXO_CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Database locked

Rare on SQLite but possible under heavy write load:

```
sqlite3.OperationalError: database is locked
```

Solution: Switch to PostgreSQL (change `db.py` connection string, run migration) or reduce write rate.

### Pi can't connect

- Check server is bound to `0.0.0.0` (not `127.0.0.1`)
- Check firewall: macOS System Settings → Network → Firewall, Linux `sudo ufw status`
- Verify ports are open: `telnet <server-ip> 1863`
- Set Pi's `EXO_HOST` to your server's LAN IP (not localhost)

### "No module named 'fastapi'"

Activate the venv first:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Running in Production

For production deployment (Docker, systemd, reverse proxy, HTTPS), see [../DEPLOYMENT.md](../DEPLOYMENT.md).

Quick hardening checklist:

- [ ] Set `EXO_JWT_SECRET` to a secure random value
- [ ] Change admin password
- [ ] Bind HTTP to `127.0.0.1` behind a reverse proxy (Caddy/Nginx)
- [ ] Enable HTTPS via Let's Encrypt
- [ ] Restrict `EXO_CORS_ORIGINS` to known frontends
- [ ] Set up SQLite backups (or migrate to PostgreSQL)
- [ ] Run as non-root user
- [ ] Configure systemd service for auto-restart

---

## See Also

- [../README.md](../README.md) — Project overview
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Protocol spec, data flows
- [../DEPLOYMENT.md](../DEPLOYMENT.md) — Production deployment
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — Development guide
