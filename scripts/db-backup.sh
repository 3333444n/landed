#!/usr/bin/env sh
# Writes a compressed PostgreSQL dump of the development database to backups/.
# Usage: pnpm db:backup [database]   (default: landed)
set -eu
db="${1:-landed}"
user="${POSTGRES_USER:-landed}"
mkdir -p backups
file="backups/${db}-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db pg_dump -U "$user" -d "$db" --format=custom > "$file"
echo "Backup written to $file"
