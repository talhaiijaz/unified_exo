#!/bin/bash
# Deploy the Pi agent to a Raspberry Pi via SCP.
# Usage: ./scripts/deploy_pi.sh <pi-user>@<pi-ip>
#
# Example: ./scripts/deploy_pi.sh nanotech@192.168.1.50

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <user@pi-ip>"
    echo "Example: $0 nanotech@192.168.1.50"
    exit 1
fi

PI_TARGET="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REMOTE_DIR="/home/$(echo $PI_TARGET | cut -d@ -f1)/exo_agent"

echo "========================================="
echo "  Deploying Pi Agent to $PI_TARGET"
echo "========================================="

# Create remote directory
echo "[1/4] Creating remote directory..."
ssh "$PI_TARGET" "mkdir -p $REMOTE_DIR/devices"

# Copy agent files
echo "[2/4] Copying agent files..."
scp "$ROOT_DIR/pi_agent/agent.py" "$PI_TARGET:$REMOTE_DIR/"
scp "$ROOT_DIR/pi_agent/config.py" "$PI_TARGET:$REMOTE_DIR/"
scp "$ROOT_DIR/pi_agent/telemetry.py" "$PI_TARGET:$REMOTE_DIR/"
scp "$ROOT_DIR/pi_agent/devices.json" "$PI_TARGET:$REMOTE_DIR/"
scp "$ROOT_DIR/pi_agent/requirements.txt" "$PI_TARGET:$REMOTE_DIR/"
scp "$ROOT_DIR/pi_agent/devices/"*.py "$PI_TARGET:$REMOTE_DIR/devices/"

# Install dependencies
echo "[3/4] Installing dependencies on Pi..."
ssh "$PI_TARGET" "cd $REMOTE_DIR && pip3 install -r requirements.txt"

# Show how to run
echo "[4/4] Done!"
echo ""
echo "========================================="
echo "  Pi Agent deployed to $REMOTE_DIR"
echo "========================================="
echo ""
echo "To start the agent on the Pi:"
echo "  ssh $PI_TARGET"
echo "  cd $REMOTE_DIR"
echo "  EXO_HOST=<your-laptop-ip> python3 agent.py"
echo ""
echo "Or with simulation mode (no hardware):"
echo "  EXO_SIM_MODE=1 EXO_HOST=<your-laptop-ip> python3 agent.py"
echo ""
echo "To run as a service (auto-start on boot):"
echo "  ssh $PI_TARGET"
echo "  sudo tee /etc/systemd/system/exo-agent.service <<EOF"
echo "  [Unit]"
echo "  Description=Exo-Platform Pi Agent"
echo "  After=network.target"
echo "  [Service]"
echo "  User=$(echo $PI_TARGET | cut -d@ -f1)"
echo "  WorkingDirectory=$REMOTE_DIR"
echo "  Environment=EXO_HOST=<your-laptop-ip>"
echo "  ExecStart=/usr/bin/python3 $REMOTE_DIR/agent.py"
echo "  Restart=always"
echo "  [Install]"
echo "  WantedBy=multi-user.target"
echo "  EOF"
echo "  sudo systemctl enable exo-agent"
echo "  sudo systemctl start exo-agent"
