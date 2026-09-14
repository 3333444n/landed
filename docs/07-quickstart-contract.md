# 07 — Quickstart

Status: contributor path and ordinary-user path implemented and tested on macOS (2026-09-13); Windows and Linux untested. Updated 2026-09-13.

## Contributor path (tested)

Prerequisites: Node 22 (see `.node-version`), pnpm 10 (`corepack enable` installs the pinned version), Docker with Compose, Git.

```sh
git clone https://github.com/3333444n/landed.git
cd landed
pnpm install
cp .env.example .env            # database credentials for local development
cp .env.test.example .env.test  # the isolated database used by tests
pnpm db:up                      # starts PostgreSQL 17 in Docker with a persistent volume
pnpm db:migrate                 # applies db/migrations to the landed database
pnpm dev                        # http://localhost:3000
```

The first visit asks for your name and creates the single profile of this installation. Career facts live under About me in the sidebar; Jobs stays empty until Phase 1. Data lives in the Docker volume `landed_pgdata`, outside the source checkout. `pnpm db:down` stops the database and keeps the volume.

Tests use a second database, `landed_test`, created automatically when the volume is first initialised. Apply migrations to it once, then run the checks listed in [CONTRIBUTING](../CONTRIBUTING.md):

```sh
DATABASE_URL=postgres://landed:landed@localhost:5432/landed_test pnpm db:migrate
pnpm test:integration
pnpm test:e2e
```

Browser tests start their own server on port 3417 and truncate `landed_test` first; they never touch `landed`.

Backup and restore of the development database (tested):

```sh
pnpm db:backup                                   # writes backups/landed-<timestamp>.dump
pnpm db:restore backups/landed-<timestamp>.dump  # replaces the database contents with the dump
```

Troubleshooting: "Docker daemon not running" means start Docker Desktop; "port 5432 already in use" means another PostgreSQL is running, stop it or change the port mapping in `docker-compose.yml` and `DATABASE_URL`; "Invalid configuration: DATABASE_URL" means `.env` is missing.

## Ordinary user path (tested on macOS with Docker Desktop, 2026-09-13)

Prerequisites: Docker Desktop (macOS, Windows) or Docker Engine with the Compose v2 plugin (Linux), and about 1 GB of free disk for the images and your data. No Node, PostgreSQL, paid AI account, or agent CLI. Docker is a substantial prerequisite; this is not a double-click install.

```sh
git clone https://github.com/3333444n/landed.git   # or download and unpack a release bundle
cd landed
sh scripts/landed.sh start                          # Windows: powershell -ExecutionPolicy Bypass -File scripts\landed.ps1 start
```

The first `start` takes a few minutes: it creates `.env.release` with a random database password (only if the file does not exist), builds the application image, starts PostgreSQL, applies the migrations in a one-time `migrate` task, and starts the web service only after the migrations succeed. Then open http://127.0.0.1:3000 and enter your name; the profile starts blank. `sh scripts/landed.sh status` shows both services as `healthy` when ready.

Other commands: `stop` (stops the containers, keeps your data), `status`, `logs [service]`, `backup`, `restore <file>`.

How data is stored: PostgreSQL writes to the Docker named volume `landed-release_pgdata`, outside the source checkout. It survives `stop`, `start`, container restarts, image rebuilds and upgrades. Only the web port is published, and only on 127.0.0.1 of your computer; the database has no host port and is reachable only by the application inside the Compose network ([compose.release.yml](../compose.release.yml)). `.env.release` holds the generated credentials and is ignored by Git; keep it, because the database volume was initialised with that password.

Upgrade: `git pull` (or unpack the new bundle over the old folder, keeping `.env.release`), then `sh scripts/landed.sh start` again. It rebuilds the image and the `migrate` task applies any new migrations before the new server starts. The PostgreSQL image is pinned to a minor version in `compose.release.yml`; a major-version change (17 to 18) will ship with an explicit backup/restore procedure, never a floating tag.

Backup and restore (tested):

```sh
sh scripts/landed.sh backup                                   # writes backups/landed-release-<timestamp>.dump
sh scripts/landed.sh restore backups/landed-release-<timestamp>.dump   # replaces the database contents
```

Copy dumps somewhere safe; `backups/` is ignored by Git but lives in the checkout.

Factory reset (separate, deliberate; deletes all your data): take a backup if you want one, then

```sh
sh scripts/landed.sh stop
docker volume rm landed-release_pgdata
rm .env.release          # optional; the next start generates a new password
sh scripts/landed.sh start
```

No launcher command removes the volume, and `stop` never passes `-v`.

Troubleshooting:

- "Docker is installed but not running": start Docker Desktop (or `sudo systemctl start docker` on Linux) and run `start` again.
- `ports are not available ... 127.0.0.1:3000: bind: address already in use`, or a different app answers at the URL: another program uses port 3000. Edit `LANDED_PORT` in `.env.release` (for example `LANDED_PORT=3480`), run `start` again and open that port.
- `start` stops with `service "migrate" didn't complete successfully: exit 1`: the migration failed and the web service was deliberately not started. Read `sh scripts/landed.sh logs migrate`, fix the cause (usually the database, see next item), and run `start` again; migrations are applied once and skipped afterwards.
- Database unavailable (`db` not `healthy` in `status`, or "Migration failed: ... ECONNREFUSED"/authentication errors): read `sh scripts/landed.sh logs db`. A changed `POSTGRES_PASSWORD` in `.env.release` after the first start causes authentication failures, because the volume keeps the original password; restore the old value.
- Image download or build fails: check the internet connection (the first start downloads the Node and PostgreSQL images), then run `start` again; Docker resumes from its cache.
- Permission errors from Docker on Linux: add your user to the `docker` group or run the launcher with `sudo`.
- Low disk space: `docker system df` shows usage; `docker image prune` removes unused images without touching the data volume. Never run `docker volume prune` while Landed is stopped, it would delete `landed-release_pgdata`.

Later phases keep this shape: an explicit demo action uses a separate demo database, never the personal one, and provider configuration happens in the application. Startup never seeds or resets data.

## Required verification before claiming easy setup

Verified on macOS (Apple Silicon, Docker Desktop, 2026-09-13) unless marked otherwise.

- Fresh install without pre-existing local dependencies beyond stated prerequisites: verified (clean state, no `.env.release`, only Docker used).
- App readiness reflects both service health and successful migrations: verified (`web` waits for `migrate` to complete successfully and `db` to be healthy; its own health check loads a database-backed page).
- Data survives process/container restart, image recreation, and supported application upgrade: verified for restart, `stop`/`start` and image rebuild; a real version-to-version upgrade with new migrations is not yet exercised because there is one migration.
- Backup/restore works on a new installation: verified; artifact files come with Phase 1.
- Restart/stop never silently deletes volumes. Factory reset is separate and explicit: verified (`stop` runs `down` without `-v`; the reset is documented above and manual).
- Helpful troubleshooting for Docker not running, occupied port, failed download, permission failure, database unavailable, migration failure, and low disk space: written above; the Docker-not-running, port-in-use and migration-failure cases were exercised, the others are documented from Docker's own messages.
- Pin supported versions and explain upgrade steps: images pinned (`node:22.23-bookworm-slim`, `postgres:17.11`); the PostgreSQL major-version procedure is still to be written when a major bump is planned.
- Verify release images on intended CPU architectures and document tested macOS, Windows, and Linux setups: tested on macOS arm64 only. Windows (`scripts/landed.ps1`), Linux and x86-64 are untested.
- Phase 0 works offline after installation; example data and tests require no provider key: verified (the containers make no outbound requests; Next.js telemetry is disabled in the image).

Store runtime data in volumes outside the source checkout. Ignore files are a second guard, not backup or access control. Release bundles include only an explicit allowlist of application assets; never package the entire workspace with personal files.

## Reference lessons

[Resume Matcher SETUP](https://github.com/srbhr/Resume-Matcher/blob/main/SETUP.md) documents local development, provider setup, Docker, and troubleshooting. Its retrieved [.github/CONTRIBUTING.md](https://github.com/srbhr/Resume-Matcher/blob/main/.github/CONTRIBUTING.md) includes older setup paths inconsistent with that guide; verify current source before copying any commands. Our installation instructions have one owner: this document.

[ai-job-search](https://github.com/MadsLorentzen/ai-job-search) uses an installed agent environment and local tools. Its tracked profile-file approach introduces different contribution/privacy concerns than an app that stores user data outside Git. Borrow workflow ideas without inheriting that storage arrangement.
