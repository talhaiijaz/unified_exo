#!/usr/bin/env bash
# First-time production server setup.
# Run on the server with sudo for systemd steps: ./scripts/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "=== Unified Server install ==="

# Backend venv
if [[ ! -d server/.venv ]]; then
  echo "[1/6] Creating Python venv..."
  python3 -m venv server/.venv
fi
server/.venv/bin/pip install -r server/requirements.txt -q
echo "  Backend venv ready"

# Frontend deps
echo "[2/6] Installing frontend dependencies..."
cd nanotech_website
pnpm install --frozen-lockfile
pnpm build
cd "$ROOT_DIR"

# Data directories
echo "[3/6] Creating data directories..."
sudo mkdir -p /var/lib/exo-platform/recordings
sudo mkdir -p /etc/exo-platform
sudo chown -R nanotech:nanotech /var/lib/exo-platform

# Env files (only if missing)
if [[ ! -f /etc/exo-platform/server.env ]]; then
  echo "[4/6] Creating /etc/exo-platform/server.env from example..."
  sudo cp deploy/server.env.example /etc/exo-platform/server.env
  echo "  Edit /etc/exo-platform/server.env — set EXO_JWT_SECRET"
else
  echo "[4/6] /etc/exo-platform/server.env already exists — skipped"
fi

if [[ ! -f /etc/exo-platform/frontend.env ]]; then
  sudo cp deploy/frontend.env.example /etc/exo-platform/frontend.env
  echo "  Edit /etc/exo-platform/frontend.env — set basic auth password"
else
  echo "  /etc/exo-platform/frontend.env already exists — skipped"
fi

# Systemd
echo "[5/6] Installing systemd units..."
sudo cp deploy/exo-server.service /etc/systemd/system/
sudo cp deploy/exo-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable exo-server.service exo-frontend.service
sudo systemctl restart exo-server.service exo-frontend.service

echo "[6/6] Disabling user-level duplicate frontend if present..."
systemctl --user stop exo-frontend.service 2>/dev/null || true
systemctl --user disable exo-frontend.service 2>/dev/null || true

echo ""
echo "Install complete. Verify:"
echo "  systemctl status exo-server exo-frontend"
echo "  curl http://127.0.0.1:5000/api/clients"
echo "  curl http://127.0.0.1:8080/"
