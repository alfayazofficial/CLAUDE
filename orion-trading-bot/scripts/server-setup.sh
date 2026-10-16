#!/usr/bin/env bash
# Run ONCE on a fresh Ubuntu/Debian server (e.g. Oracle Cloud Always Free):
#   curl -fsSL <raw url of this file> | bash      or copy it over and run: bash server-setup.sh
set -euo pipefail
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi
mkdir -p ~/orion/data
# Free ports only for SSH. The dashboard is bound to localhost, reach it with: ssh -L 3000:localhost:3000 user@server
echo
echo "Done. NEXT:"
echo "  1) log out and back in (so docker works without sudo)"
echo "  2) create ~/orion/.env  (copy the contents of .env.testnet.example, fill ADMIN_TOKEN + Binance testnet keys)"
echo "  3) add DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY as GitHub repo secrets, then run the 'Orion testnet' workflow"
