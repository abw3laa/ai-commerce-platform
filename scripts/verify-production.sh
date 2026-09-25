#!/bin/sh
set -eu
: "${BASE_URL:?BASE_URL is required}"
curl --fail --silent --show-error "$BASE_URL/health" >/dev/null
curl --fail --silent --show-error "$BASE_URL/health/ready" >/dev/null
printf '%s\n' "production health checks passed"
