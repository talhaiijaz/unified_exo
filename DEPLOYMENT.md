# Deployment Guide

> **Production server (nanotechserver):** See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for `git pull` + `./scripts/deploy.sh`.  
> **First-time install:** `./scripts/install.sh`

From local laptop development to production servers. This guide covers five deployment scenarios from simplest to most sophisticated.

---

## Deployment Scenarios

| Scenario | Use When | Complexity |
|----------|----------|:----------:|
| [1. Local Development](#1-local-development) | Testing, dev work, demos | Trivial |
| [2. Local Network (Single Lab)](#2-local-network-single-lab) | Multiple Pis + researchers in the same lab | Easy |
| [3. Docker Compose](#3-docker-compose) | Isolated environment, reproducible | Medium |
| [4. Dedicated Server](#4-dedicated-server) | Production lab server (Berkeley-style) | Medium |
| [5. Cloud + Tailscale Mesh](#5-cloud--tailscale-mesh) | Geographically distributed Pis | Advanced |

---

## 1. Local Development

**Your laptop = server. Everything on `localhost`.**

### Setup

Three terminals on your laptop:

```bash
# Terminal 1 — Backend
cd server && python3 app.py

# Terminal 2 — Pi agent (simulated)
EXO_SIM_MODE=1 EXO_HOST=127.0.0.1 python3 pi_agent/agent.py

# Terminal 3 — Frontend
cd nanotech_website && pnpm dev
```

Open http://localhost:3000/portal/exo.

### Or use the one-liner

```bash
./scripts/start_server.sh
```

---

## 2. Local Network (Single Lab)

**Your laptop = server. Real Raspberry Pis on the same WiFi connect to it.**

### Step 1: Find your laptop's LAN IP

```bash
# macOS
ipconfig getifaddr en0
# Linux
hostname -I | awk '{print $1}'
```

Example: `192.168.1.100`

### Step 2: Start server binding to all interfaces

```bash
EXO_HOST=0.0.0.0 python3 server/app.py
```

### Step 3: Open firewall (if blocking)

**macOS:** System Settings → Network → Firewall → Options → Allow `Python` incoming connections.

**Linux:**
```bash
sudo ufw allow 5000/tcp
sudo ufw allow 1863/tcp
sudo ufw allow 8612/tcp
sudo ufw allow 8613/tcp
```

### Step 4: Configure Pis

On each Pi, set the server IP:

```bash
# In ~/.bashrc or systemd service
export EXO_HOST=192.168.1.100
```

Start the Pi agent (see [pi_agent/README.md](pi_agent/README.md)).

### Step 5: Researchers access the dashboard

From any browser on the same network: **http://192.168.1.100:3000/portal/exo**

---

## 3. Docker Compose

**Everything containerized. One command to start the whole stack.**

### Prerequisites

- Docker & Docker Compose installed

### Setup

```bash
cd united_exo
cp server/.env.example server/.env          # Configure if needed
docker-compose up --build
```

This starts:
- `server` — FastAPI backend
- `frontend` — Next.js dev server
- `pi_sim` — A simulated Pi agent (for testing)

Open http://localhost:3000/portal/exo.

### Stop

```bash
docker-compose down
```

### Production build

```bash
docker-compose -f docker-compose.prod.yml up -d
```

See `docker-compose.yml` and `Dockerfile` in the repo root.

---

## 4. Dedicated Server

**A dedicated Linux server (e.g., Berkeley physics server) runs everything. Pis connect to it over LAN/VPN. Researchers access via HTTPS.**

### Architecture

```
Internet → HTTPS (Caddy/Nginx) → Next.js :3000 + FastAPI :5000
                                              │
                                   TCP (LAN/VPN)
                                              │
                              Pis across campus
```

### Prerequisites

- Linux server (Ubuntu 22.04+, AlmaLinux 9, Debian 12)
- Domain name pointed to server
- SSH access
- Sudo privileges

### Step 1: Install system dependencies

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm git caddy
sudo npm install -g pnpm
```

### Step 2: Clone the repo

```bash
git clone https://github.com/talhaiijaz/united_exo.git /opt/exo-platform
cd /opt/exo-platform
```

### Step 3: Set up backend

```bash
cd /opt/exo-platform/server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Production config
cat > .env <<EOF
EXO_HOST=0.0.0.0
EXO_HTTP_PORT=5000
EXO_CONTROL_PORT=1863
EXO_VIDEO_PORT=8612
EXO_TELEMETRY_PORT=8613
EXO_JWT_SECRET=$(openssl rand -hex 32)
EXO_CORS_ORIGINS=https://exo.your-domain.com
EXO_DATABASE_PATH=/var/lib/exo-platform/exo_data.db
EXO_RECORDINGS_DIR=/var/lib/exo-platform/recordings
EOF

sudo mkdir -p /var/lib/exo-platform
sudo chown -R $USER:$USER /var/lib/exo-platform
```

### Step 4: Systemd service for backend

```bash
sudo tee /etc/systemd/system/exo-server.service > /dev/null <<EOF
[Unit]
Description=Exo-Platform Server
After=network.target

[Service]
Type=simple
User=exo
Group=exo
WorkingDirectory=/opt/exo-platform/server
EnvironmentFile=/opt/exo-platform/server/.env
ExecStart=/opt/exo-platform/server/.venv/bin/python3 app.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/exo-server.log
StandardError=append:/var/log/exo-server.log

[Install]
WantedBy=multi-user.target
EOF

sudo useradd -r -s /bin/false exo 2>/dev/null || true
sudo chown -R exo:exo /opt/exo-platform /var/lib/exo-platform
sudo systemctl daemon-reload
sudo systemctl enable exo-server
sudo systemctl start exo-server
```

### Step 5: Set up frontend

```bash
cd /opt/exo-platform/nanotech_website
pnpm install
pnpm build

# Create production env
cat > .env.local <<EOF
EXO_BACKEND_URL=http://127.0.0.1:5000
EOF
```

### Step 6: Systemd service for frontend

```bash
sudo tee /etc/systemd/system/exo-frontend.service > /dev/null <<EOF
[Unit]
Description=Exo-Platform Frontend
After=network.target exo-server.service

[Service]
Type=simple
User=exo
Group=exo
WorkingDirectory=/opt/exo-platform/nanotech_website
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable exo-frontend
sudo systemctl start exo-frontend
```

### Step 7: Caddy for HTTPS reverse proxy

Edit `/etc/caddy/Caddyfile`:

```
exo.your-domain.com {
    # Frontend
    reverse_proxy /* http://127.0.0.1:3000

    # Backend API (hit directly, bypasses Next.js proxy)
    reverse_proxy /api/* http://127.0.0.1:5000

    # WebSocket support for telemetry
    reverse_proxy /api/exo/*/telemetry/ws http://127.0.0.1:5000 {
        header_up Connection {>Connection}
        header_up Upgrade {>Upgrade}
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logs
    log {
        output file /var/log/caddy/exo-access.log
    }
}
```

Reload:
```bash
sudo systemctl reload caddy
```

Caddy auto-provisions Let's Encrypt certificates.

### Step 8: Firewall rules

```bash
sudo ufw allow 80/tcp           # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp          # HTTPS
sudo ufw allow 1863/tcp         # Pi control (from LAN only — restrict with --from)
sudo ufw allow 8612/tcp         # Pi video
sudo ufw allow 8613/tcp         # Pi telemetry
sudo ufw enable
```

For tighter security, restrict Pi-facing ports to your lab's subnet:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 1863
sudo ufw allow from 192.168.1.0/24 to any port 8612
sudo ufw allow from 192.168.1.0/24 to any port 8613
```

### Step 9: Verify

```bash
# Check services
sudo systemctl status exo-server exo-frontend caddy

# Check logs
sudo journalctl -u exo-server -f

# Health check
curl https://exo.your-domain.com/api/health
```

### Updating

```bash
cd /opt/exo-platform
sudo -u exo git pull

# If backend changed
sudo systemctl restart exo-server

# If frontend changed
cd nanotech_website
sudo -u exo pnpm install && sudo -u exo pnpm build
sudo systemctl restart exo-frontend
```

---

## 5. Cloud + Tailscale Mesh

**Pis are distributed geographically (home labs, remote institutions). Tailscale provides a zero-config mesh VPN so Pis can reach the server regardless of NAT/firewalls.**

### Why Tailscale?

- Pis behind any NAT/router — no port forwarding needed
- Each device gets a stable `100.x.x.x` IP on your tailnet
- End-to-end WireGuard encryption
- Free for up to 100 devices on a personal plan

### Step 1: Create a Tailscale tailnet

1. Sign up at [tailscale.com](https://tailscale.com)
2. Generate an auth key: Settings → Keys → Generate Auth Key

### Step 2: Install Tailscale on server

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --authkey=tskey-auth-...
sudo tailscale ip -4   # Note this IP, e.g., 100.64.0.1
```

### Step 3: Install Tailscale on each Pi

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --authkey=tskey-auth-...
```

### Step 4: Configure Pi agents to use Tailscale IP

```bash
# On each Pi
export EXO_HOST=100.64.0.1    # Server's tailscale IP
python3 agent.py
```

### Step 5: (Optional) Access dashboard via Tailscale

Researchers install Tailscale on their laptops and access `http://100.64.0.1:3000/portal/exo`.

Or expose the dashboard publicly via Caddy (as in scenario 4) and use Tailscale only for Pi-to-server links.

---

## Production Hardening Checklist

Before exposing Exo-Platform to the internet:

### Authentication
- [ ] Change default admin password
- [ ] Rotate `EXO_JWT_SECRET` to a random 32+ byte value
- [ ] Create individual researcher accounts (no shared admin)
- [ ] Consider adding OAuth (Google/GitHub) for easier researcher onboarding

### Network
- [ ] Backend HTTP port bound to `127.0.0.1`, not `0.0.0.0`
- [ ] Pi-facing ports (1863, 8612, 8613) restricted to trusted subnet or VPN
- [ ] HTTPS via reverse proxy (Caddy, Nginx, or Traefik)
- [ ] HSTS header enabled
- [ ] Firewall configured (ufw, iptables, or cloud security group)
- [ ] Fail2ban for SSH and HTTP brute-force protection

### Application
- [ ] `EXO_CORS_ORIGINS` restricted to known frontend URLs
- [ ] Rate limiting on `/api/auth/login` (via Caddy / middleware)
- [ ] Logs sent to centralized logging (systemd journal, Loki, or similar)
- [ ] Structured logging enabled

### Data
- [ ] SQLite backups scheduled (`cron` with `sqlite3 .backup`)
- [ ] OR migrate to PostgreSQL for concurrent writes at scale
- [ ] Recordings stored on durable media (NAS, S3)
- [ ] Research data retention policy defined (IRB requirement)

### Monitoring
- [ ] Uptime monitoring (Uptime Kuma, UptimeRobot)
- [ ] Disk space alerts (recordings and database grow over time)
- [ ] Memory/CPU alerts
- [ ] Error tracking (Sentry recommended)

### Backup
- [ ] Daily automated database backup
- [ ] Weekly off-site backup (S3, rsync to another server)
- [ ] Documented restore procedure, tested annually

### Safety (for labs using stimulation devices)
- [ ] Physical e-stop wired directly to power
- [ ] TENS auto-stop tested
- [ ] IRB approval on file
- [ ] Operator training documented
- [ ] Emergency contact list visible

---

## Migrating from SQLite to PostgreSQL

When you outgrow SQLite (~100 concurrent Pis or heavy telemetry workloads):

### Step 1: Set up PostgreSQL

```bash
sudo apt install postgresql
sudo -u postgres psql -c "CREATE USER exo WITH PASSWORD 'securepass';"
sudo -u postgres psql -c "CREATE DATABASE exo_data OWNER exo;"
```

### Step 2: Update server/db.py

Replace the sqlite connection with SQLAlchemy + asyncpg:

```python
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine("postgresql+asyncpg://exo:securepass@localhost/exo_data")
```

### Step 3: Migrate existing data

```bash
# Dump SQLite
sqlite3 exo_data.db .dump > data.sql

# Modify for PostgreSQL compatibility
sed -i 's/AUTOINCREMENT/SERIAL/g' data.sql

# Import
psql -U exo -d exo_data -f data.sql
```

### Step 4: Consider TimescaleDB for telemetry

For time-series telemetry, TimescaleDB (PostgreSQL extension) provides 10-100x query speedup:

```sql
CREATE EXTENSION timescaledb;
SELECT create_hypertable('telemetry', 'timestamp');
```

---

## Troubleshooting Production Issues

### Service won't start

```bash
sudo systemctl status exo-server
sudo journalctl -u exo-server -n 100
```

Common issues:
- Port already in use (check `ss -tulpn | grep 5000`)
- Permission denied on database file (check `ls -la /var/lib/exo-platform`)
- Missing environment variables (check `.env`)

### Pis can't connect after deploy

- Check server logs for connection attempts
- Verify firewall rules: `sudo ufw status`
- Test from Pi: `telnet <server-ip> 1863`
- Check DNS resolution on Pi: `dig your-domain.com`

### Browser shows 502 Bad Gateway

- Backend service is down — `sudo systemctl restart exo-server`
- Caddy can't reach backend — check `Caddyfile` reverse_proxy URL
- Firewall blocking `127.0.0.1` connection (unlikely but possible)

### High memory usage

- Many connected Pis + video streams = high RAM
- Check `top` or `htop`
- Each Pi with video uses ~50MB RAM on server side
- If running out, add swap or scale horizontally

### Database locked errors

- SQLite under heavy concurrent load
- Solutions:
  - Reduce telemetry rate on Pis
  - Batch writes more aggressively
  - Migrate to PostgreSQL

---

## See Also

- [README.md](README.md) — Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [server/README.md](server/README.md) — Server configuration
- [pi_agent/README.md](pi_agent/README.md) — Pi setup
