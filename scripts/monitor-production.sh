#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
if curl --fail --silent --show-error "${BASE_URL}/health/ready" >/dev/null; then exit 0; fi
message="AI Commerce production readiness check failed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s\n' "$message" >&2
if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
  payload=$(printf '{"text":"%s"}' "$message")
  curl --fail --silent --show-error -X POST -H 'content-type: application/json' --data "$payload" "$ALERT_WEBHOOK_URL" >/dev/null
fi
exit 1
