# Production Deployment

See also the root [DEPLOYMENT.md](../DEPLOYMENT.md) for scenario-based guides.

## Quick deploy (after PR merged)

```bash
ssh -p 3000 nanotech@nanotechserver.ddns.net
cd /opt/unified_exo
git pull origin main
./scripts/deploy.sh
```

## First-time server install

```bash
cd /opt/unified_exo
./scripts/install.sh
```

Then edit:
- `/etc/exo-platform/server.env`
- `/etc/exo-platform/frontend.env`

## Port map

| Port | Service |
|------|---------|
| 3000 | SSH only |
| 8080 | Next.js frontend |
| 5000 | FastAPI API |
| 1863/8612/8613 | Pi agent TCP |

## Systemd units

Installed from `deploy/`:
- `exo-server.service`
- `exo-frontend.service` (port **8080**)

## Git remote

Production server should track:

```
origin  git@github.com:jadoo-tech/unified_server.git
```

## Never edit code directly on server

All changes go through GitHub PR → merge → `deploy.sh`.
