#!/usr/bin/env bash
# Sync Worker secrets from environment variables (used in GitHub Actions).
# Usage: sync-worker-secrets.sh [--env beta]
set -euo pipefail

ENV_FLAG=()
if [ "${1:-}" = "--env" ] && [ -n "${2:-}" ]; then
  ENV_FLAG=(--env "$2")
fi

if [ -z "${JWT_SECRET:-}" ]; then
  echo "::error::JWT_SECRET is not set. Add it as a GitHub secret or export it locally."
  exit 1
fi

put_secret() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | npx wrangler secret put "$name" "${ENV_FLAG[@]}"
}

put_secret JWT_SECRET "$JWT_SECRET"

if [ -n "${B2_APPLICATION_KEY_ID:-}" ] && [ -n "${B2_APPLICATION_KEY:-}" ]; then
  put_secret B2_APPLICATION_KEY_ID "$B2_APPLICATION_KEY_ID"
  put_secret B2_APPLICATION_KEY "$B2_APPLICATION_KEY"
else
  echo "Skipping B2 secrets (not configured)."
fi

echo "Worker secrets synced (${ENV_FLAG[*]:-production})."
