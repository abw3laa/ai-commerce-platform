#!/bin/sh
set -eu

: "${BASE_URL:?BASE_URL is required}"

echo "[1] liveness"
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null

echo "[2] readiness"
curl --fail --silent --show-error "$BASE_URL/health/ready" >/dev/null

echo "[3] metrics must not be public in production"
status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/metrics")"
if [ "$status" = "200" ]; then
  echo "FAIL: /metrics is publicly readable" >&2
  exit 1
fi

echo "[4] cross-site state-changing request must be blocked"
status="$(curl --silent --output /dev/null --write-out '%{http_code}'   -X POST   -H 'Origin: https://evil.example'   -H 'Sec-Fetch-Site: cross-site'   "$BASE_URL/admin/logout")"
if [ "$status" != "403" ]; then
  echo "FAIL: expected 403 from cross-site admin request, got $status" >&2
  exit 1
fi

echo "non-destructive security smoke test passed"
