#!/usr/bin/env bash
# Set up read-only GitHub deploy key for git pull on the production server.
# Run once on the server as nanotech: ./scripts/setup-github-deploy-key.sh

set -euo pipefail

KEY_PATH="$HOME/.ssh/unified_server_deploy"
SSH_CONFIG="$HOME/.ssh/config"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [[ ! -f "$KEY_PATH" ]]; then
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "nanotechserver-deploy"
  echo "Created deploy key: $KEY_PATH"
fi

PUB=$(cat "${KEY_PATH}.pub")
echo ""
echo "=== Add this deploy key to jadoo-tech/unified_server ==="
echo "GitHub → repo → Settings → Deploy keys → Add read-only key"
echo "Title: nanotechserver"
echo ""
echo "$PUB"
echo ""
echo "Or from your laptop:"
echo "  gh api repos/jadoo-tech/unified_server/keys -f title=nanotechserver -f key=\"\$(cat -)\" -f read_only=true < ${KEY_PATH}.pub"
echo ""

# SSH config for github.com with this key
if ! grep -q "unified_server_deploy" "$SSH_CONFIG" 2>/dev/null; then
  cat >> "$SSH_CONFIG" <<EOF

Host github.com-unified-server
  HostName github.com
  User git
  IdentityFile $KEY_PATH
  IdentitiesOnly yes
EOF
  chmod 600 "$SSH_CONFIG"
  echo "Added SSH host alias: github.com-unified-server"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if git remote get-url origin | grep -q "https://github.com/jadoo-tech/unified_server"; then
  git remote set-url origin git@github.com-unified-server:jadoo-tech/unified_server.git
  echo "Set origin to git@github.com-unified-server:jadoo-tech/unified_server.git"
fi

echo ""
echo "After adding the deploy key on GitHub, test:"
echo "  git pull origin main"
