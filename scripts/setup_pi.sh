#!/bin/bash
# ============================================================================
# Exo-Platform — Raspberry Pi Setup Script
# ============================================================================
# Prepares a fresh Raspberry Pi OS installation for running the exo agent.
#
# Run on a FRESH Pi:
#   curl -fsSL https://raw.githubusercontent.com/talhaiijaz/united_exo/main/scripts/setup_pi.sh | bash
#
# Or download and inspect first (recommended):
#   wget https://raw.githubusercontent.com/talhaiijaz/united_exo/main/scripts/setup_pi.sh
#   chmod +x setup_pi.sh
#   ./setup_pi.sh
# ============================================================================

set -e

# ---- Colors ----
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[setup]${NC} $1"; }
success() { echo -e "${GREEN}[ok]${NC} $1"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $1"; }
error()   { echo -e "${RED}[error]${NC} $1" >&2; }

# ---- Banner ----
cat <<'BANNER'

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        Exo-Platform — Raspberry Pi Setup                     ║
║        Prepares Pi OS for the exoskeleton agent              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

BANNER

# ---- Prerequisites ----
if [ ! -f /etc/rpi-issue ] && [ ! -f /etc/os-release ]; then
    warn "This doesn't appear to be a Raspberry Pi. Continuing anyway..."
fi

if [ "$EUID" -eq 0 ]; then
    warn "Running as root — some steps may work differently."
fi

# ---- Step 1: Update system ----
log "[1/7] Updating system packages..."
sudo apt update -qq
sudo apt upgrade -y -qq
success "System updated"

# ---- Step 2: Install required packages ----
log "[2/7] Installing system packages..."
sudo apt install -y -qq \
    python3 \
    python3-pip \
    python3-venv \
    python3-picamera2 \
    python3-serial \
    python3-pil \
    i2c-tools \
    git \
    curl \
    minicom \
    htop
success "System packages installed"

# ---- Step 3: Enable hardware interfaces ----
log "[3/7] Enabling hardware interfaces (I2C, SPI, Serial, Camera)..."
sudo raspi-config nonint do_i2c 0       2>/dev/null || warn "Could not enable I2C"
sudo raspi-config nonint do_spi 0       2>/dev/null || warn "Could not enable SPI"
sudo raspi-config nonint do_camera 0    2>/dev/null || warn "Could not enable camera"
sudo raspi-config nonint do_serial_hw 0 2>/dev/null || warn "Could not enable serial hardware"
sudo raspi-config nonint do_serial_cons 1 2>/dev/null || warn "Could not disable serial console"
success "Hardware interfaces enabled (reboot required)"

# ---- Step 4: Add user to required groups ----
log "[4/7] Adding user '$USER' to hardware groups..."
sudo usermod -aG dialout,i2c,spi,gpio,video "$USER"
success "Added to groups: dialout, i2c, spi, gpio, video"

# ---- Step 5: Install Python dependencies ----
log "[5/7] Installing Python packages globally for agent..."
pip3 install --user --break-system-packages Pillow pyserial 2>/dev/null || \
    pip3 install --user Pillow pyserial
success "Python packages installed"

# ---- Step 6: Set up agent directory ----
AGENT_DIR="$HOME/exo_agent"
log "[6/7] Setting up agent directory at $AGENT_DIR..."

if [ -d "$AGENT_DIR" ]; then
    warn "Directory $AGENT_DIR exists — skipping"
else
    mkdir -p "$AGENT_DIR"
    success "Created $AGENT_DIR"
fi

cat > "$AGENT_DIR/README.txt" <<'EOF'
Deploy the agent files to this directory using:
  ./scripts/deploy_pi.sh user@this-pi-ip

Or manually SCP:
  scp -r pi_agent/* user@this-pi-ip:~/exo_agent/

Then run:
  cd ~/exo_agent
  EXO_HOST=<your-server-ip> python3 agent.py
EOF

# ---- Step 7: Configure systemd service template ----
log "[7/7] Creating systemd service template..."

sudo tee /etc/systemd/system/exo-agent.service > /dev/null <<EOF
[Unit]
Description=Exo-Platform Pi Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$AGENT_DIR
Environment=EXO_HOST=192.168.1.100
Environment=EXO_CLIENT_ID=$(hostname)
ExecStart=/usr/bin/python3 $AGENT_DIR/agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
success "Service template created at /etc/systemd/system/exo-agent.service"

# ---- Completion ----
cat <<COMPLETE

╔══════════════════════════════════════════════════════════════╗
║                   Setup Complete!                            ║
╚══════════════════════════════════════════════════════════════╝

Next steps:

  1. Reboot the Pi to apply hardware interface changes:

       sudo reboot

  2. After reboot, deploy the agent from your laptop:

       ./scripts/deploy_pi.sh $USER@$(hostname -I | awk '{print $1}')

  3. Edit the service to set your server's IP:

       sudo nano /etc/systemd/system/exo-agent.service
       # Change: Environment=EXO_HOST=<your-server-ip>

  4. Enable and start the service:

       sudo systemctl enable exo-agent
       sudo systemctl start exo-agent
       sudo systemctl status exo-agent

Verify hardware detection:

  i2cdetect -y 1                        # Should show I2C devices
  libcamera-hello --list-cameras        # Should list connected camera
  ls /dev/ttyUSB* /dev/ttyACM*          # Should show Arduino

Reboot now?
COMPLETE

read -p "[y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo reboot
fi
