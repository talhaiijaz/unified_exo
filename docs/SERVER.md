# Server Operations Guide

**Host:** `nanotechberkeley`  
**SSH:** `ssh -p 3000 nanotech@nanotechserver.ddns.net`  
**Code:** `/opt/unified_exo`

## Services

```bash
systemctl status exo-server exo-frontend
sudo systemctl restart exo-server
sudo systemctl restart exo-frontend
```

## Logs

```bash
journalctl -u exo-server -f
journalctl -u exo-frontend -f
```

## Config files (not in git)

| File | Purpose |
|------|---------|
| `/etc/exo-platform/server.env` | Backend secrets and ports |
| `/etc/exo-platform/frontend.env` | Basic auth credentials |
| `/var/lib/exo-platform/` | SQLite DB and recordings |

## Deploy latest code

```bash
cd /opt/unified_exo
./scripts/deploy.sh
```

## First-time setup

```bash
cd /opt/unified_exo
./scripts/install.sh
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend crash loop on :3000 | Ensure `deploy/exo-frontend.service` uses PORT=8080; SSH uses :3000 |
| API 404 | Check `exo-server` is running: `curl localhost:5000/api/clients` |
| Frontend 401 | Expected without basic auth — site is protected |
| Pi not connecting | Check `EXO_HOST` on Pi points to server LAN IP |

## Health checks

```bash
curl -s http://127.0.0.1:5000/api/clients
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/
```
