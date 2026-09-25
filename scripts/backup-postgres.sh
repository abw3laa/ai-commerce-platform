#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/ai-commerce-$STAMP.dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$FILE"
printf '%s\n' "$FILE"
