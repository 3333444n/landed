#!/bin/sh
# Fails when db/migrations is out of date with the Drizzle schema. Runs drizzle-kit generate
# (which needs no database) and then checks that it produced nothing. CI and `pnpm verify`
# both call this; keep the logic here so the two never drift.
set -eu
cd "$(dirname "$0")/.."
pnpm db:generate
if [ -n "$(git status --porcelain db/migrations)" ]; then
  echo "db/migrations is out of date with the schema. Run 'pnpm db:generate' and commit the result." >&2
  git status --porcelain db/migrations >&2
  git diff -- db/migrations >&2
  git ls-files --others --exclude-standard db/migrations | while read -r f; do
    echo "--- $f" >&2
    cat "$f" >&2
  done
  exit 1
fi
echo "Migrations match the schema."
