#!/usr/bin/env bash
# Deploy latest main to the production server.
# Run from repo root: ./scripts/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "=== Unified Server deploy ==="
echo "Repo: $ROOT_DIR"
echo ""

echo "[1/5] Pulling latest main..."
git pull origin main

echo "[2/5] Backend dependencies..."
if [[ -f server/.venv/bin/pip ]]; then
  server/.venv/bin/pip install -r server/requirements.txt -q
else
  echo "  Warning: server/.venv not found — run scripts/install.sh first"
fi

echo "[3/5] Frontend build..."
cd nanotech_website
pnpm install --frozen-lockfile
pnpm build
cd "$ROOT_DIR"

echo "[4/5] Restarting services..."
if systemctl is-active --quiet exo-server.service 2>/dev/null; then
  sudo systemctl restart exo-server.service
  echo "  Restarted exo-server (system)"
elif systemctl --user is-active --quiet exo-server.service 2>/dev/null; then
  systemctl --user restart exo-server.service
  echo "  Restarted exo-server (user)"
else
  echo "  Warning: exo-server not running — start with sudo systemctl start exo-server"
fi

if systemctl is-active --quiet exo-frontend.service 2>/dev/null; then
  sudo systemctl restart exo-frontend.service
  echo "  Restarted exo-frontend (system)"
elif systemctl --user is-active --quiet exo-frontend.service 2>/dev/null; then
  systemctl --user restart exo-frontend.service
  echo "  Restarted exo-frontend (user)"
else
  echo "  Warning: exo-frontend not running — start with systemctl start exo-frontend"
fi

echo "[5/5] Health checks..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/clients || echo "000")
FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ || echo "000")
echo "  API  :5000/api/clients → $API_CODE"
echo "  Web  :8080             → $FE_CODE (401 without auth is OK)"
echo ""
echo "Deploy complete."
