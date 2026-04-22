#!/usr/bin/env bash
# run.sh — Start EEG Lab server
# Usage:
#   ./run.sh              (uses config.yaml)
#   ./run.sh --reload     (dev mode with auto-reload)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate venv if present
if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
fi

# Check serial port permission
PORT=$(python3 -c "import yaml; c=yaml.safe_load(open('config.yaml')); print(c['serial']['port'])" 2>/dev/null || echo "/dev/ttyACM0")
if [ -e "$PORT" ] && [ ! -r "$PORT" ]; then
  echo "[WARN] Cannot read $PORT — try: sudo usermod -a -G dialout \$USER"
  echo "       Then log out and back in."
fi

HOST_IP=$(python3 - <<PY
import socket
try:
  s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  s.connect(('8.8.8.8',80))
  print(s.getsockname()[0])
  s.close()
except Exception:
  print('localhost')
PY
)
echo "============================================"
echo " EEG Lab Server — UC Berkeley Nanotechnology Lab"
echo " http://${HOST_IP}:8000"
echo "============================================"
echo ""

if [[ "$1" == "--reload" ]]; then
  uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
else
  uvicorn backend.main:app --host 0.0.0.0 --port 8000
fi
