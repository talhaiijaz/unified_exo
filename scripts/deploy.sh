#!/usr/bin/env bash
# Deploy latest main to production.
# Run from repo root: ./scripts/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "=== Unified Server deploy ==="
echo "Repo: $ROOT_DIR"
echo ""

echo "[1/5] Pulling latest main from GitHub..."
git pull origin main

echo "[2/5] Backend dependencies..."
if [[ -f server/.venv/bin/python ]] && server/.venv/bin/python -c "import sys" >/dev/null 2>&1; then
  server/.venv/bin/pip install -r server/requirements.txt -q
else
  echo "  Recreating backend venv (missing or stale path after migrate)..."
  rm -rf server/.venv
  python3 -m venv server/.venv
  server/.venv/bin/pip install -r server/requirements.txt -q
fi

echo "[3/5] Frontend build..."
cd nanotech_website
pnpm install --frozen-lockfile
pnpm build
cd "$ROOT_DIR"

echo "[4/5] Restarting services..."
if systemctl is-active --quiet unified-server.service 2>/dev/null; then
  sudo systemctl restart unified-server.service
  sudo systemctl restart unified-server-frontend.service
  echo "  Restarted unified-server + unified-server-frontend"
elif systemctl is-active --quiet exo-server.service 2>/dev/null; then
  sudo systemctl restart exo-server.service
  systemctl --user restart exo-frontend.service 2>/dev/null || sudo systemctl restart exo-frontend.service 2>/dev/null || true
  echo "  Restarted legacy exo-* services (run install.sh to migrate)"
else
  echo "  Warning: no active services found — run ./scripts/install.sh"
fi

echo "[5/5] Health checks..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/clients || echo "000")
FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ || echo "000")
echo "  API  :5000/api/clients → $API_CODE"
echo "  Web  :8080             → $FE_CODE (401 without auth is OK)"
echo ""
echo "Deploy complete."
