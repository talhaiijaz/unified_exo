# Server Operations Guide

**Host:** `nanotechberkeley`  
**SSH:** `ssh -p 3000 nanotech@nanotechserver.ddns.net`  
**Code:** `/opt/unified_server`

## Services

```bash
systemctl status unified-server unified-server-frontend
sudo systemctl restart unified-server
sudo systemctl restart unified-server-frontend
```

## Logs

```bash
journalctl -u unified-server -f
journalctl -u unified-server-frontend -f
```

## Config files (not in git)

| File | Purpose |
|------|---------|
| `/etc/unified-server/server.env` | Backend secrets and ports |
| `/etc/unified-server/frontend.env` | Basic auth credentials |
| `/var/lib/unified-server/` | SQLite DB and recordings |

## Deploy latest code

```bash
cd /opt/unified_server
./scripts/deploy.sh
```

## First-time setup

```bash
cd /opt/unified_server
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
