#!/usr/bin/env bash
# deploy.sh — one-shot production deployment script.
#
# Usage:
#   ./deploy/scripts/deploy.sh
#
# What it does:
#   1. Validates that .env exists and the secrets look real (not the placeholders)
#   2. Builds and starts the docker-compose stack
#   3. Waits for the backend health check to pass
#   4. Runs the database seeder (idempotent — skips existing users)
#   5. Prints the public URLs + admin credentials

set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose"

echo "================================================"
echo "  IT Ticketing System — Production Deployment"
echo "================================================"
echo ""

# ---- 1. Validate .env ----
if [ ! -f .env ]; then
  echo "❌ .env not found. Copy .env.example → .env and edit the values first."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

if [ "${JWT_SECRET:-}" = "run_openssl_rand_hex_32_to_generate_this" ] || \
   [ "${JWT_REFRESH_SECRET:-}" = "run_openssl_rand_hex_32_to_generate_this_too" ] || \
   [ "${MONGO_PASSWORD:-}" = "change_me_to_a_strong_password" ]; then
  echo "❌ .env still contains placeholder secrets. Generate real ones with:"
  echo "   openssl rand -hex 32  # for JWT_SECRET"
  echo "   openssl rand -hex 32  # for JWT_REFRESH_SECRET"
  echo "   And set a real MONGO_PASSWORD."
  exit 1
fi

echo "✅ .env validated"
echo ""

# ---- 2. Build + start ----
echo "🔨 Building containers..."
$COMPOSE build --pull
echo ""
echo "🚀 Starting services..."
$COMPOSE up -d
echo ""

# ---- 3. Wait for backend health ----
echo "⏳ Waiting for backend to be healthy..."
for i in $(seq 1 30); do
  if $COMPOSE ps backend | grep -q "healthy"; then
    echo "✅ Backend is healthy"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "❌ Backend did not become healthy within 30s"
    $COMPOSE logs backend --tail 30
    exit 1
  fi
  sleep 2
done
echo ""

# ---- 4. Seed ----
echo "🌱 Seeding database (skips existing users)..."
$COMPOSE exec -T backend npm run seed || true
echo ""

# ---- 5. Summary ----
echo "================================================"
echo "  ✅ Deployment complete!"
echo "================================================"
echo ""
echo "Frontend:  http://localhost:8080"
echo "Backend:   http://localhost:5000/api/health"
echo ""
echo "Login:"
echo "  Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo ""
echo "Next steps:"
echo "  - For HTTPS: install the host nginx config from deploy/nginx/ and run:"
echo "      certbot --nginx -d ${CLIENT_URL#https://}"
echo "  - View logs:        docker compose logs -f"
echo "  - Stop services:    docker compose down"
echo "  - Wipe everything:  docker compose down -v"
