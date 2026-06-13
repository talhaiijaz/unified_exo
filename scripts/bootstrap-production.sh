#!/usr/bin/env bash
# ONE-TIME: run on server with sudo password when prompted.
#   ssh -t nanotechserver
#   cd /opt/unified_exo && sudo bash scripts/bootstrap-production.sh

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

OLD="/opt/unified_exo"
NEW="/opt/unified_server"

echo "=== Unified Server production bootstrap ==="

# Stop all legacy services
systemctl stop exo-server exo-frontend unified-server unified-server-frontend 2>/dev/null || true
systemctl disable exo-frontend 2>/dev/null || true
systemctl mask exo-frontend 2>/dev/null || true
sudo -u nanotech XDG_RUNTIME_DIR=/run/user/$(id -u nanotech) systemctl --user stop exo-frontend 2>/dev/null || true

# Rename code directory
if [[ -d "$OLD" && ! -d "$NEW" ]]; then
  mv "$OLD" "$NEW"
  chown -R nanotech:nanotech "$NEW"
  echo "Renamed $OLD → $NEW"
fi

cd "$NEW"

# Migrate config/data paths
mkdir -p /etc/unified-server /var/lib/unified-server/recordings
chown -R nanotech:nanotech /var/lib/unified-server

if [[ -d /var/lib/exo-platform ]]; then
  rsync -a /var/lib/exo-platform/ /var/lib/unified-server/ || true
fi
if [[ -f /etc/exo-platform/server.env && ! -f /etc/unified-server/server.env ]]; then
  cp /etc/exo-platform/server.env /etc/unified-server/server.env
  sed -i 's|/var/lib/exo-platform|/var/lib/unified-server|g' /etc/unified-server/server.env
fi
if [[ -f /home/nanotech/.config/systemd/user/exo-frontend.service && ! -f /etc/unified-server/frontend.env ]]; then
  grep SITE_BASIC_AUTH /home/nanotech/.config/systemd/user/exo-frontend.service > /etc/unified-server/frontend.env || true
fi
if [[ ! -f /etc/unified-server/server.env ]]; then
  cp deploy/server.env.example /etc/unified-server/server.env
fi
if [[ ! -f /etc/unified-server/frontend.env ]]; then
  cp deploy/frontend.env.example /etc/unified-server/frontend.env
fi
chmod 640 /etc/unified-server/*.env

# Install systemd
cp deploy/unified-server.service /etc/systemd/system/
cp deploy/unified-server-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl disable exo-server exo-frontend 2>/dev/null || true
systemctl enable unified-server unified-server-frontend
systemctl restart unified-server unified-server-frontend

sudo -u nanotech XDG_RUNTIME_DIR=/run/user/$(id -u nanotech) systemctl --user disable exo-frontend 2>/dev/null || true

echo ""
echo "Bootstrap complete."
echo "  Code:   $NEW"
echo "  Config: /etc/unified-server/"
echo "  Data:   /var/lib/unified-server/"
systemctl is-active unified-server unified-server-frontend
