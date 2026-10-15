#!/usr/bin/env bash
#
# dev.sh - start the local dev stack (docker compose) and attach the
# Stripe CLI webhook listener on top of it.
#
# Usage:
#   ./dev.sh              start everything
#   ./dev.sh --no-build   skip the `--build` step
#
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Error: .env not found next to dev.sh" >&2
  exit 1
fi

# Load .env into this shell so STRIPE_SECRET_KEY etc. are available below.
set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "Error: STRIPE_SECRET_KEY is not set in .env" >&2
  exit 1
fi

BUILD_FLAG="--build"
if [[ "${1:-}" == "--no-build" ]]; then
  BUILD_FLAG=""
fi

echo "==> Starting docker compose stack..."
docker compose up -d ${BUILD_FLAG}

echo "==> Waiting for server to become healthy on :8000..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:8000/health" >/dev/null 2>&1; then
    echo "    server is up."
    break
  fi
  sleep 1
  if [[ "$i" == 30 ]]; then
    echo "    Warning: server didn't respond after 30s, continuing anyway."
  fi
done

# Where the Stripe CLI container should send webhooks. On Linux, --network
# host lets it reach "localhost:8000" directly. On Docker Desktop (Mac/
# Windows), --network host is a no-op, so we forward to
# host.docker.internal instead.
UNAME_S="$(uname -s)"
if [[ "$UNAME_S" == "Linux" ]]; then
  NETWORK_ARGS=(--network host)
  FORWARD_HOST="localhost"
else
  NETWORK_ARGS=()
  FORWARD_HOST="host.docker.internal"
fi

cleanup() {
  echo
  echo "==> Stopping Stripe CLI listener..."
  docker rm -f stripe-cli-dev >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "==> Starting Stripe CLI webhook listener (forwarding to ${FORWARD_HOST}:8000)..."
echo "    (docker compose stack keeps running in the background after Ctrl+C)"
docker run --rm -it \
  --name stripe-cli-dev \
  "${NETWORK_ARGS[@]}" \
  stripe/stripe-cli:latest \
  listen \
  --api-key "${STRIPE_SECRET_KEY}" \
  --forward-to "${FORWARD_HOST}:8000/billing/webhook/stripe"