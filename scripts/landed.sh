#!/usr/bin/env sh
# Launcher for the packaged installation (ADR 003). Requires only Docker with Compose v2.
# Usage: sh scripts/landed.sh start|stop|status|logs|backup|restore <file>
#
# `start` creates .env.release on first run (random database password) and never overwrites it.
# `stop` keeps the data volume; a factory reset is a separate, deliberate command, see
# docs/07-quickstart-contract.md.
set -eu

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
env_file=".env.release"
compose="docker compose --env-file $env_file -f compose.release.yml"

usage() {
  echo "Usage: sh scripts/landed.sh start|stop|status|logs|backup|restore <file>" >&2
  exit 2
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is not installed. Install Docker Desktop (macOS/Windows) or Docker Engine with the Compose plugin (Linux), then retry." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is installed but not running. Start Docker Desktop (or the docker service) and retry." >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose v2 is missing ('docker compose' failed). Update Docker or install the compose plugin." >&2
    exit 1
  fi
}

random_password() {
  # Hex only, so the value is safe inside the DATABASE_URL that compose.release.yml builds.
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    od -An -N24 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

ensure_env() {
  if [ -f "$env_file" ]; then
    return
  fi
  password="$(random_password)"
  # Copy the example, replacing only the password placeholder; the other values (port, the
  # optional LANDED_MODEL_* lines) keep their documented defaults and stay editable by hand.
  sed "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$password/" .env.release.example > "$env_file"
  echo "Created $env_file with a generated database password."
  echo "To let the app call a model provider, fill in the LANDED_MODEL_* lines in $env_file and run start again; paste-back mode works without them."
}

env_value() {
  # Reads KEY=value from .env.release without executing it.
  grep "^$1=" "$env_file" | head -n 1 | cut -d= -f2-
}

require_env() {
  if [ ! -f "$env_file" ]; then
    echo "$env_file not found. Run 'sh scripts/landed.sh start' first." >&2
    exit 1
  fi
}

cmd="${1:-}"
[ -n "$cmd" ] || usage
shift

case "$cmd" in
  start)
    require_docker
    ensure_env
    # --build rebuilds the image from the current sources, so `start` is also the upgrade
    # command. The migrate service runs before web accepts requests.
    $compose up -d --build
    port="$(env_value LANDED_PORT)"
    echo "Landed is starting at http://127.0.0.1:${port:-3000}"
    echo "Run 'sh scripts/landed.sh status' to see when it reports healthy."
    ;;
  stop)
    require_docker
    require_env
    # Deliberately no -v: containers go, the pgdata volume with personal data stays.
    $compose down
    echo "Stopped. Your data is kept in the Docker volume landed-release_pgdata."
    ;;
  status)
    require_docker
    require_env
    $compose ps
    ;;
  logs)
    require_docker
    require_env
    $compose logs --tail=200 "$@"
    ;;
  backup)
    require_docker
    require_env
    user="$(env_value POSTGRES_USER)"
    db="$(env_value POSTGRES_DB)"
    mkdir -p backups
    file="backups/landed-release-$(date -u +%Y%m%dT%H%M%SZ).dump"
    $compose exec -T db pg_dump -U "$user" -d "$db" --format=custom > "$file"
    echo "Backup written to $file"
    # Generated PDFs live on the artifacts volume; the archive sits next to the dump.
    artifacts="${file%.dump}-artifacts.tar"
    if $compose exec -T web tar -C /app -cf - artifacts > "$artifacts" 2>/dev/null; then
      echo "PDF archive written to $artifacts"
    else
      rm -f "$artifacts"
      echo "No PDF archive written (web service not running or no artifacts yet)."
    fi
    ;;
  restore)
    require_docker
    require_env
    file="${1:-}"
    if [ -z "$file" ]; then
      echo "Usage: sh scripts/landed.sh restore <dump file>" >&2
      exit 2
    fi
    user="$(env_value POSTGRES_USER)"
    db="$(env_value POSTGRES_DB)"
    $compose exec -T db pg_restore -U "$user" -d "$db" --clean --if-exists --no-owner --exit-on-error < "$file"
    echo "Restored $file into $db"
    artifacts="${file%.dump}-artifacts.tar"
    if [ -f "$artifacts" ]; then
      $compose exec -T web tar -C /app -xf - < "$artifacts"
      echo "Restored PDFs from $artifacts"
    fi
    ;;
  *)
    usage
    ;;
esac
