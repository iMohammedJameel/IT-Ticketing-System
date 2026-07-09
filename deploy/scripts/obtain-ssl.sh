#!/usr/bin/env bash
# obtain-ssl.sh — obtain a Let's Encrypt SSL certificate for the domain.
#
# Prerequisites:
#   - A server with a public IP
#   - The domain pointed at the server (A record)
#   - nginx installed on the host
#   - The host nginx config (deploy/nginx/it-ticketing.conf) installed
#     and edited with the real domain name
#
# Usage:
#   sudo ./deploy/scripts/obtain-ssl.sh it-ticketing.example.com

set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  echo "Example: $0 it-ticketing.example.com"
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo"
  exit 1
fi

echo "Installing certbot..."
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

echo ""
echo "Obtaining certificate for $DOMAIN..."
# --nginx tells certbot to automatically edit the nginx config to add the cert paths
certbot --nginx -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

echo ""
echo "Setting up auto-renewal..."
# certbot installs a systemd timer by default — verify it's enabled
systemctl enable certbot.timer
systemctl start certbot.timer
systemctl status certbot.timer --no-pager | head -5

echo ""
echo "✅ SSL certificate installed for $DOMAIN"
echo "The certificate will auto-renew via the certbot systemd timer."
echo ""
echo "Test the renewal (does not actually renew):"
echo "  sudo certbot renew --dry-run"
