#!/usr/bin/env bash
# One-time migration: /opt/unified_exo → /opt/unified_server
# Run on server with sudo: sudo bash scripts/migrate-server-path.sh

set -euo pipefail

OLD_PATH="/opt/unified_exo"
NEW_PATH="/opt/unified_server"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-running with sudo..."
  exec sudo bash "$0" "$@"
fi

if [[ ! -d "$OLD_PATH" ]]; then
  if [[ -d "$NEW_PATH" ]]; then
    echo "Already migrated: $NEW_PATH exists"
    exit 0
  fi
  echo "Error: $OLD_PATH not found"
  exit 1
fi

if [[ -d "$NEW_PATH" ]]; then
  echo "Error: $NEW_PATH already exists"
  exit 1
fi

echo "Stopping services..."
systemctl stop exo-server.service 2>/dev/null || true
systemctl stop exo-frontend.service 2>/dev/null || true
systemctl stop unified-server.service 2>/dev/null || true
systemctl stop unified-server-frontend.service 2>/dev/null || true
sudo -u nanotech XDG_RUNTIME_DIR=/run/user/$(id -u nanotech) systemctl --user stop exo-frontend.service 2>/dev/null || true

echo "Moving $OLD_PATH → $NEW_PATH"
mv "$OLD_PATH" "$NEW_PATH"
chown -R nanotech:nanotech "$NEW_PATH"

echo "Migration complete. Run as nanotech:"
echo "  cd $NEW_PATH && ./scripts/install.sh"
