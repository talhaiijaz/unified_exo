# Backend Guide

**Path:** `server/`  
**Stack:** FastAPI, SQLite, Python 3.10+

## Add a new API route

1. Create `server/routes/my_feature.py`
2. Register the router in `server/app.py`
3. Test locally:

```bash
cd server
python app.py
# API docs: http://localhost:5000/docs
```

## Configuration

- Local: copy `server/.env.example` to `server/.env`
- Production: `/etc/exo-platform/server.env` (from `deploy/server.env.example`)

Never commit real secrets.

## Key endpoints

| Path | Purpose |
|------|---------|
| `/api/clients` | Connected Pi agents |
| `/api/commands` | Send device commands |
| `/api/telemetry` | Sensor data |
| `/docs` | OpenAPI UI |

## Restart after changes

```bash
sudo systemctl restart exo-server
# Or locally: Ctrl+C and python app.py
```

## Database

SQLite at `/var/lib/exo-platform/exo_data.db` on production. Schema in `server/db.py`.

## Submitting changes

1. Fork `jadoo-tech/unified_server`
2. Branch: `feature/my-api`
3. Open PR — note if new env vars are needed
4. After merge, deployer runs `./scripts/deploy.sh`
