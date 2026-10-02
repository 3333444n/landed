# 07 — Quickstart

Status: contributor path on SQLite (ADR 013, 2026-10-02); the Docker Compose release and its launcher were removed, and the desktop release that replaces them is not built yet. The "Connect your assistant" path ([ADR 008](adr/008-assistant-surface-over-mcp.md)) is implemented as of 2026-09-16 and tested from Claude Code on a contributor install. Windows and Linux untested.

Profile management under [ADR 009](adr/009-profile-management-over-mcp.md) is merged. The ADR 011 writing-context and canonical-company extensions are implemented and merged in PRs #43–47 (2026-09-23). See [current verification](09-decisions-and-readiness.md#smaller-pr-stack-verification-2026-09-23).

## Contributor path (tested)

Prerequisites: Node 24 (see `.node-version`), pnpm 10 (`corepack enable` installs the pinned version), Git. No database server: the data is one SQLite file.

```sh
git clone https://github.com/3333444n/landed.git
cd landed
pnpm install
cp .env.example .env            # database path and optional model settings
cp .env.test.example .env.test  # the separate database file used by browser tests
pnpm db:migrate                 # creates data/landed.db and applies db/migrations
pnpm dev                        # http://localhost:3000
```

The first visit asks for your name and creates the single profile of this installation. Career facts live under Profile in the sidebar, with General info and About me as separate blocks; postings and applications live under Jobs, shared employer records under Companies and customizable Job Sources under Settings. The button at the bottom of the sidebar switches between light and dark; without a choice the system preference applies. Data lives in the file named by `LANDED_DATABASE_PATH` (default `./data/landed.db`, ignored by Git); generated PDFs and company logos live under `LANDED_ARTIFACT_DIR`.

Generating documents (Phase 1b) needs either a model provider or nothing at all. With nothing configured, each document offers Paste back: the app shows the prompt, you run it in any assistant you already use and paste the JSON answer back. To let the app call a provider itself, pick one row of the table below, set its values in `.env` (the same blocks are commented in `.env.example`), then restart `pnpm dev`. The Settings column in the app shows what is configured without revealing the key, and lists the same blocks when nothing is configured.

| Provider | `LANDED_MODEL_PROVIDER` | `LANDED_MODEL` example | Key | `LANDED_MODEL_BASE_URL` |
|---|---|---|---|---|
| [OpenRouter](https://openrouter.ai/models) (one key, models from many companies) | `openrouter` | `google/gemini-3.1-flash-lite` (the slug on the model's page) | from [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) | not needed |
| Anthropic | `anthropic` | `claude-sonnet-5` | from console.anthropic.com | not needed |
| OpenAI | `openai` | `gpt-5` | from platform.openai.com | not needed |
| Vercel AI Gateway | `gateway` | `anthropic/claude-sonnet-5` | from the Vercel dashboard | not needed |
| Ollama or any OpenAI-compatible server | `openai_compatible` | `llama3.1` | optional | required, for example `http://localhost:11434/v1` |

The model name is whatever the provider spells it as on its own model page; there is no separate model URL to find. Cost per run is shown in the Runs column only when the provider reports it (OpenRouter and the Vercel AI Gateway do; Anthropic and OpenAI report tokens only). The key is loaded from the environment file and used to authenticate provider requests; it is not stored in the database, included in backups or logged. Which company receives your facts is the provider you chose; with the Vercel AI Gateway or OpenRouter, that service relays them to the model's operator.

Connect your assistant ([ADR 008](adr/008-assistant-surface-over-mcp.md)): the third way to get documents written is the assistant you already pay for. Three steps: set the variable below in `.env` and restart `pnpm dev`; open Settings → Connect your assistant in the app (`/settings/assistant`) and copy the block for Claude Code, Codex or Claude Desktop (the blocks print `127.0.0.1` and the port you opened the app on, which is what the Host check accepts); install the workflow. For Claude Code, `claude plugin marketplace add 3333444n/landed` then `claude plugin install landed@landed` (it asks for the address and the token from the block). For Codex, run it inside the checkout, which discovers `.agents/skills/landed` by itself, or link the skill into your user skills with `mkdir -p ~/.agents/skills && ln -s "$PWD/.agents/skills/landed" ~/.agents/skills/landed`. Then ask it for a resume; it reads your jobs and facts through Landed and submits its drafts through the same checks. The assistant path adds one variable to the provider table above:

| Variable | Purpose | Value |
|---|---|---|
| `LANDED_MCP_TOKEN` | Bearer token the assistant presents on `/mcp`; without it the endpoint answers 503 | any long random string, at least 24 characters, in `.env` only |

Integration tests open temporary database files; browser tests use the file named in `.env.test` and empty it first, never `data/landed.db`. Both use the fake model adapter (`LANDED_MODEL_PROVIDER=fake` in `.env.test`), so no key is ever needed for the checks listed in [CONTRIBUTING](../CONTRIBUTING.md).

Backup and restore:

```sh
pnpm db:backup                                 # writes backups/landed-<timestamp>.db; safe while the app runs
pnpm db:restore backups/landed-<timestamp>.db  # stop the app first; replaces the database file
```

`backups/` is ignored by Git but lives in the checkout; copy backups somewhere safe, together with the artifact directory.

Troubleshooting: "no such table" means the migrations were not applied: run `pnpm db:migrate` with the same `LANDED_DATABASE_PATH` as the app. Preserve the database file; do not delete or reseed it to recover startup.

## Upgrading from a Docker/PostgreSQL install

The Docker Compose release and the PostgreSQL development database were removed under [ADR 013](adr/013-desktop-distribution.md). To move existing data, keep the old PostgreSQL container running (from the old checkout), take a backup there first, then in the new checkout run:

```sh
pnpm install
pnpm import:postgres -- --from postgres://<user>:<password>@localhost:5432/landed [--to ./data/landed.db]
```

The importer only reads PostgreSQL (its session is read-only), creates and migrates the SQLite file, copies every table in one transaction, prints a row-count comparison per table and exits non-zero on any difference. It refuses a target file that already has a profile. The released installation published no database port, so map `5432` on `127.0.0.1` for the duration of the import, or run it against a contributor database. Copy the old artifact directory (the `landed-release_artifacts` volume, or `./artifacts`) to `LANDED_ARTIFACT_DIR` so stored PDFs and logos stay reachable. Delete the old volumes only after checking the imported data in the app.

## Required verification before claiming easy setup

Verified on macOS (Apple Silicon, Docker Desktop, 2026-09-13) unless marked otherwise. These records cover the removed Docker release; the desktop release (ADR 013) is verified again when it ships.

- Fresh install without pre-existing local dependencies beyond stated prerequisites: verified (clean state, no `.env.release`, only Docker used).
- App readiness reflects both service health and successful migrations: verified (`web` waits for `migrate` to complete successfully and `db` to be healthy; its own health check loads a database-backed page).
- Data survives process/container restart, image recreation, and supported application upgrade: verified for restart, `stop`/`start` and image rebuild, and once for an upgrade with a new migration (2026-09-14: the Phase 1b image started over a volume created with migrations 0000 and 0001 and the migrate task applied 0002 before the web service started). There are seven migrations (0000 to 0006); a tagged version-to-version upgrade is not yet exercised because there is no tagged release.
- Backup/restore works on a new installation: verified, including the artifacts archive (2026-09-14: a probe file in `/app/artifacts` was archived by `backup`, deleted, and came back with `restore`; the web service answered afterwards). PowerShell launcher: database only.
- Restart/stop never silently deletes volumes. Factory reset is separate and explicit: verified (`stop` runs `down` without `-v`; the reset is documented above and manual).
- Helpful troubleshooting for Docker not running, occupied port, failed download, permission failure, database unavailable, migration failure, and low disk space: written above; the Docker-not-running, port-in-use and migration-failure cases were exercised, the others are documented from Docker's own messages.
- Pin supported versions and explain upgrade steps: images pinned (`node:24.21-bookworm-slim`, `postgres:17.11`); the PostgreSQL major-version procedure is still to be written when a major bump is planned.
- Verify release images on intended CPU architectures and document tested macOS, Windows, and Linux setups: tested on macOS arm64 only. Windows (`scripts/landed.ps1`), Linux and x86-64 are untested.
- Phase 0 and 1a work offline after installation; example data and tests require no provider key: verified (the containers make no outbound requests; Next.js telemetry is disabled in the image). From Phase 1b the web service calls the provider configured in `.env.release`; it also fetches a logo address when the user supplies one (ADR 007). Paste-back and connected assistants may send the facts they receive to their own model providers.
- Connect your assistant (ADR 008): the contributor path is tested (2026-09-16, macOS): `LANDED_MCP_TOKEN` set in `.env`, the Claude Code block copied from the Settings column, the plugin installed, and a posting added and the three documents written, submitted and rendered from Claude Code through `/mcp`. The packaged path is not tested: the launcher's token generation on a fresh `start`, the append on an older `.env.release`, the `token` command and the endpoint inside the container have not been exercised in Docker (the base image pull stalled during the check). The Codex and Claude Desktop blocks are written from their vendors' documentation and not run end to end.

Store runtime data in volumes outside the source checkout. Ignore files are a second guard, not backup or access control. Release bundles include only an explicit allowlist of application assets; never package the entire workspace with personal files.

## Reference lessons

[Resume Matcher SETUP](https://github.com/srbhr/Resume-Matcher/blob/main/SETUP.md) documents local development, provider setup, Docker, and troubleshooting. Its retrieved [.github/CONTRIBUTING.md](https://github.com/srbhr/Resume-Matcher/blob/main/.github/CONTRIBUTING.md) includes older setup paths inconsistent with that guide; verify current source before copying any commands. Our installation instructions have one owner: this document.

[ai-job-search](https://github.com/MadsLorentzen/ai-job-search) uses an installed agent environment and local tools. Its tracked profile-file approach introduces different contribution/privacy concerns than an app that stores user data outside Git. Borrow workflow ideas without inheriting that storage arrangement.

## Using profile tools (ADR 009)

Use the same Settings → Connect your assistant setup and refresh the connected tool list after restarting the updated server. The merged profile extension provides `get_profile`, `create_profile`, `update_profile` and add/update/delete tools for each career-record type. Use the skill from the same checkout; a published plugin from an older release may still describe only the document workflow.

On an empty installation, ask “Create my profile with the name Morgan Example.” Then try “Add PostgreSQL to my skills,” “Put that skill in the Databases category,” and “Delete the PostgreSQL skill.” Refresh the Profile hub (About me on the earlier baseline) in the browser to inspect each result. These examples are fictional; use an isolated local database for demonstrations. The profile workflow does not require a job or a model API key. Existing installations keep their data, token and configuration; whole-profile deletion is not exposed.

The user confirmed successful local assistant testing on 2026-09-17. Harness-specific coverage and packaged verification for this extension have not yet been recorded. The original connection verification above applies only to ADR 008.


## Upgrading for career context links (migration 0007)

The packaged launcher applies migrations during startup. Contributors update their checkout and run `pnpm db:migrate` before starting the updated application. Follow the backup instructions above before upgrading; do not reset the database or delete its volume. Migration 0007 adds direct skill-to-role and skill-to-project link tables without a data backfill. Existing facts and saved generation snapshots remain unchanged. Roles/projects with direct skill links must be detached before deletion.

## Upgrading to writing context and canonical Companies (implemented and merged)

Back up the database and artifact directory before applying migrations 0008–0011. Use the documented contributor `pnpm db:backup` / `pnpm db:migrate` commands, or the packaged launcher's documented backup and update workflow; do not reset or recreate volumes. Stop older app instances sharing the database before migration and restart only the matching new code afterward. Migration 0011 removes job-owned name/logo columns, so an old checkout is not compatible with the upgraded schema. Rollback requires restoring the matching database/artifact backup and code version, not merely checking out an older branch.

Migrations 0008–0010 add About me, Interest, Job Sources, Companies and finding selections. Migration 0011 preserves existing company links, creates one distinct company for every unlinked legacy job (without name matching), and moves applicable logo metadata to companies; existing company logos win. Stored legacy image files and frozen document snapshots remain intact. New job forms may leave Company unselected. Refresh the connected assistant's tool list and use this checkout's synchronized skill: the merged ADR 011 extension exposes 42 tools and add_job uses company_id instead of the removed company string. The merged ADR 012 implementation (PRs #54–56) adds set_resume_contacts (43 tools), formatting support and resume contact preferences without a SQL migration. Existing document snapshots remain frozen.

The contributor migration and feature journeys passed the checks recorded in doc 09. This does not establish a new packaged release, a tagged rollback procedure, or new Windows/Linux coverage; those existing limits remain.

## Desktop app: model setup (ADR 013)

In the desktop app, open Settings → Model setup, choose the provider, type the model and the key, and save; the app restarts its server and the column shows the key's last four characters. The key is kept in the operating system's keychain, never in the database or a backup. Remove clears the setting, and paste back keeps working without one. `pnpm dev` and `pnpm start` still read the environment file.
