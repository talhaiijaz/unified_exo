# Unified Server Overview

**Canonical repo:** [jadoo-tech/unified_server](https://github.com/jadoo-tech/unified_server)  
**Production server:** `nanotechserver.ddns.net`  
**Code on server:** `/opt/unified_exo`

## Architecture

```
GitHub (jadoo-tech/unified_server)
        │  git pull + ./scripts/deploy.sh
        ▼
/opt/unified_exo  (monorepo on server)
        │
        ├── server/              → exo-server.service  → :5000
        ├── nanotech_website/    → exo-frontend.service → :8080
        └── pi_agent/            → runs on Raspberry Pis → :1863/:8612/:8613
```

## Port map

| Port | Service | Notes |
|------|---------|-------|
| 3000 | SSH | Do not run web apps here |
| 8080 | Next.js frontend | Public site (basic auth) |
| 5000 | FastAPI API | Internal + LAN; proxied via `/api/exo` |
| 1863 | Pi control | TCP |
| 8612 | Pi video | TCP |
| 8613 | Pi telemetry | TCP |

## Who updates what

| Role | Doc | Paths |
|------|-----|-------|
| Frontend | [FRONTEND.md](FRONTEND.md) | `nanotech_website/` |
| Backend | [BACKEND.md](BACKEND.md) | `server/` |
| Pi agents | [PI_AGENT.md](PI_AGENT.md) | `pi_agent/` |
| Exoskeleton | [EXOSKELETON.md](EXOSKELETON.md) | `Exoskeleton_public/`, `arduino/` |
| EEG lab | [EEG_LAB.md](EEG_LAB.md) | `eeg_lab/` |
| Deploy | [DEPLOYMENT.md](DEPLOYMENT.md) | `scripts/`, `deploy/` |
| Server ops | [SERVER.md](SERVER.md) | SSH, systemd, logs |
| New members | [ONBOARDING.md](ONBOARDING.md) | Start here |

## Live URLs

- Website: http://nanotechserver.ddns.net:8080
- SSH: `ssh -p 3000 nanotech@nanotechserver.ddns.net`
