#!/bin/bash
# Start the Exo-Platform server + frontend locally.
# Usage: ./scripts/start_server.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "  Exo-Platform - Starting Server"
echo "========================================="

# Install server dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "[1/3] Installing server dependencies..."
    pip3 install -r "$ROOT_DIR/server/requirements.txt"
else
    echo "[1/3] Server dependencies OK"
fi

# Start Python backend
echo "[2/3] Starting Python backend on :5000..."
cd "$ROOT_DIR/server"
python3 app.py &
SERVER_PID=$!
echo "  Backend PID: $SERVER_PID"

# Wait for server to be ready
sleep 2

# Start Next.js frontend (if pnpm is available)
if command -v pnpm &>/dev/null; then
    echo "[3/3] Starting frontend on :3000..."
    cd "$ROOT_DIR/nanotech_website"
    pnpm dev &
    FRONTEND_PID=$!
    echo "  Frontend PID: $FRONTEND_PID"
elif command -v npm &>/dev/null; then
    echo "[3/3] Starting frontend on :3000..."
    cd "$ROOT_DIR/nanotech_website"
    npm run dev &
    FRONTEND_PID=$!
    echo "  Frontend PID: $FRONTEND_PID"
else
    echo "[3/3] No pnpm/npm found, skipping frontend"
    FRONTEND_PID=""
fi

echo ""
echo "========================================="
echo "  Server running!"
echo "  API:      http://localhost:5000/api/health"
echo "  API Docs: http://localhost:5000/docs"
echo "  Frontend: http://localhost:3000/portal/exo"
echo "========================================="
echo ""
echo "To start a simulated Pi agent:"
echo "  cd $ROOT_DIR && EXO_SIM_MODE=1 EXO_HOST=127.0.0.1 python3 pi_agent/agent.py"
echo ""
echo "Press Ctrl+C to stop everything"

# Wait and cleanup
trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
