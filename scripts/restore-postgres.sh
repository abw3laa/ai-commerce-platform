#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?Usage: DATABASE_URL=... ./scripts/restore-postgres.sh backup.dump}"
pg_restore "$DATABASE_URL" --clean --if-exists --no-owner --no-acl "$1"
