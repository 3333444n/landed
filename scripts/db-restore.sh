#!/usr/bin/env sh
# Restores a dump produced by db-backup.sh into the given database, replacing its contents.
# Usage: pnpm db:restore backups/landed-<timestamp>.dump [database]   (default: landed)
set -eu
file="${1:?Usage: pnpm db:restore <dump file> [database]}"
db="${2:-landed}"
user="${POSTGRES_USER:-landed}"
docker compose exec -T db pg_restore -U "$user" -d "$db" --clean --if-exists --no-owner --exit-on-error < "$file"
echo "Restored $file into $db"
