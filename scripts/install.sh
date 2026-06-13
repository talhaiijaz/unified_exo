#!/usr/bin/env bash
# First-time production server setup.
# Run on the server: ./scripts/install.sh  (sudo prompted for systemd steps)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

INSTALL_ROOT="${INSTALL_ROOT:-/opt/unified_server}"
CONFIG_DIR="/etc/unified-server"
DATA_DIR="/var/lib/unified-server"

echo "=== Unified Server install ==="
echo "Code:    $INSTALL_ROOT"
echo "Config:  $CONFIG_DIR"
echo "Data:    $DATA_DIR"
echo ""

# Backend venv
if [[ ! -d server/.venv ]]; then
  echo "[1/7] Creating Python venv..."
  python3 -m venv server/.venv
fi
server/.venv/bin/pip install -r server/requirements.txt -q
echo "  Backend venv ready"

# Frontend deps
echo "[2/7] Installing frontend dependencies..."
cd nanotech_website
pnpm install --frozen-lockfile
pnpm build
cd "$ROOT_DIR"

# Data + config directories
echo "[3/7] Creating data and config directories..."
sudo mkdir -p "$DATA_DIR/recordings" "$CONFIG_DIR"
sudo chown -R nanotech:nanotech "$DATA_DIR"

# Migrate legacy paths if present
if [[ -d /var/lib/exo-platform && ! -L /var/lib/exo-platform ]]; then
  echo "  Migrating /var/lib/exo-platform → $DATA_DIR"
  sudo rsync -a /var/lib/exo-platform/ "$DATA_DIR/" 2>/dev/null || true
fi

# Env files
if [[ -f /etc/exo-platform/server.env && ! -f $CONFIG_DIR/server.env ]]; then
  echo "[4/7] Migrating server.env from /etc/exo-platform..."
  sudo cp /etc/exo-platform/server.env "$CONFIG_DIR/server.env"
  sudo sed -i 's|/var/lib/exo-platform|/var/lib/unified-server|g' "$CONFIG_DIR/server.env"
elif [[ ! -f $CONFIG_DIR/server.env ]]; then
  echo "[4/7] Creating $CONFIG_DIR/server.env from example..."
  sudo cp deploy/server.env.example "$CONFIG_DIR/server.env"
else
  echo "[4/7] $CONFIG_DIR/server.env exists — skipped"
fi

if [[ -f /home/nanotech/.config/systemd/user/exo-frontend.service && ! -f $CONFIG_DIR/frontend.env ]]; then
  echo "  Migrating frontend basic auth from user systemd unit..."
  AUTH_USER=$(grep SITE_BASIC_AUTH_USER /home/nanotech/.config/systemd/user/exo-frontend.service | cut -d= -f2 || echo nanotech)
  AUTH_PASS=$(grep SITE_BASIC_AUTH_PASSWORD /home/nanotech/.config/systemd/user/exo-frontend.service | cut -d= -f2 || echo CHANGE_ME)
  echo "SITE_BASIC_AUTH_USER=$AUTH_USER" | sudo tee "$CONFIG_DIR/frontend.env" >/dev/null
  echo "SITE_BASIC_AUTH_PASSWORD=$AUTH_PASS" | sudo tee -a "$CONFIG_DIR/frontend.env" >/dev/null
elif [[ ! -f $CONFIG_DIR/frontend.env ]]; then
  sudo cp deploy/frontend.env.example "$CONFIG_DIR/frontend.env"
else
  echo "  $CONFIG_DIR/frontend.env exists — skipped"
fi
sudo chown root:nanotech "$CONFIG_DIR"/*.env 2>/dev/null || true
sudo chmod 640 "$CONFIG_DIR"/*.env 2>/dev/null || true

# Systemd — new unit names
echo "[5/7] Installing systemd units..."
sudo cp deploy/unified-server.service /etc/systemd/system/
sudo cp deploy/unified-server-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload

# Disable legacy units
echo "[6/7] Disabling legacy exo-* services..."
sudo systemctl stop exo-frontend.service 2>/dev/null || true
sudo systemctl disable exo-frontend.service 2>/dev/null || true
sudo systemctl mask exo-frontend.service 2>/dev/null || true
sudo systemctl stop exo-server.service 2>/dev/null || true
sudo systemctl disable exo-server.service 2>/dev/null || true

systemctl --user stop exo-frontend.service 2>/dev/null || true
systemctl --user disable exo-frontend.service 2>/dev/null || true

sudo systemctl enable unified-server.service unified-server-frontend.service
sudo systemctl restart unified-server.service unified-server-frontend.service

echo "[7/7] GitHub deploy key hint..."
if [[ ! -f ~/.ssh/unified_server_deploy ]]; then
  echo "  Run: ./scripts/setup-github-deploy-key.sh"
fi

echo ""
echo "Install complete. Verify:"
echo "  systemctl status unified-server unified-server-frontend"
echo "  curl http://127.0.0.1:5000/api/clients"
echo "  curl -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/"
