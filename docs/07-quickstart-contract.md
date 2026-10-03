# 07 — Quickstart

Status: the desktop app ([ADR 013](adr/013-desktop-distribution.md), 2026-10-02) is the installation; the packaged app was smoke-tested on macOS, and the Windows and Linux installers are first exercised by the release workflow. The contributor path runs on SQLite with no database server. Updated 2026-10-02.

## Install the desktop app

Download the installer for your computer from [GitHub Releases](https://github.com/3333444n/landed/releases): a dmg for macOS (`arm64` for Apple silicon, `x64` for Intel), an NSIS installer for Windows, an AppImage for Linux. The builds are not signed yet, so each system asks once; the [README](../README.md#install) has the steps for each.

The first launch creates Landed's data folder in your user profile (macOS: `~/Library/Application Support/Landed`; Windows: `%APPDATA%\Landed`; Linux: `~/.config/Landed`) with `data/landed.db`, `artifacts/` for PDFs and logos, and `backups/`, then opens the window on an empty Profile. No account, database or key is needed. The server listens only on 127.0.0.1 and answers only the Landed window.

Generating documents works three ways. With nothing configured, each document offers Paste back: the app shows the prompt, you run it in any assistant you already use and paste the JSON answer back. To let the app call a provider itself, use Settings → Model setup (below). Or connect the assistant you already pay for (below).

Connect your assistant: open Settings → Connect your assistant and copy the block for your tool; it names the installed executable with `--mcp` (on macOS `/Applications/Landed.app/Contents/MacOS/Landed --mcp`; on Linux the block adds `--ozone-platform=headless` so Landed starts without a display). The assistant starts that command itself: it opens no window, uses the same data as the app (it works while the app is closed) and talks to the assistant over stdio only, so there is no token and nothing listens on the network. For Claude Code, the plugin (`claude plugin marketplace add 3333444n/landed`, then `claude plugin install landed@landed`) connects the same way and asks for the executable path. After updating Landed, restart the assistant so it starts the new version.

Updates: at launch the app checks GitHub's latest release and, when it is newer, offers to open its download page. Install the new version over the old one; nothing installs automatically yet. Its first launch backs up the database, then migrates it.

Backups: before applying pending migrations the app copies the database to `backups/landed-<version>-<time>.db` in its data folder and keeps the last five. For your own copy, quit the app and copy the data folder somewhere safe; to restore, quit the app, replace `data/landed.db` with the copy and delete any `landed.db-wal` and `landed.db-shm` beside it.

Troubleshooting:

- "This data was created by a newer Landed": the database carries a migration this version does not know. Install the latest version; nothing was changed.
- An assistant reports "Landed was updated; restart your assistant": an older `--mcp` process met a newer database. Restart the assistant.
- "This computer has no keychain Landed can use": on Linux without a keyring service, the key cannot be stored safely and is refused. Use paste-back or your assistant, or run from a checkout with the key in `.env`.
- "Landed could not start": the dialog names the cause. Keep the data folder; do not delete it to recover.

## Model setup

In the desktop app, open Settings → Model setup, choose the provider, type the model and the key, and save; the app restarts its server and the column shows the key's last four characters. The key is kept in the operating system's keychain, never in the database or a backup. Remove clears the setting, and paste back keeps working without one. `pnpm dev` and `pnpm start` still read the environment file.

## Contributor path

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

Connect your assistant ([ADR 013](adr/013-desktop-distribution.md)): the third way to get documents written is the assistant you already pay for. The assistant starts Landed itself over stdio with `pnpm mcp`, which bundles the tools and serves them on the database at `LANDED_DATABASE_PATH` (default `./data/landed.db`) with PDFs under `LANDED_ARTIFACT_DIR`, applying pending migrations first; no token and no running server are needed. Open Settings → Connect your assistant in the app (`/settings/assistant`) and copy the block for Claude Code, Codex or Claude Desktop, which names `pnpm --silent --dir <this checkout> mcp`. Then install the workflow: for Codex, run it inside the checkout, which discovers `.agents/skills/landed` by itself, or link the skill into your user skills with `mkdir -p ~/.agents/skills && ln -s "$PWD/.agents/skills/landed" ~/.agents/skills/landed`. The Claude Code plugin (`claude plugin marketplace add 3333444n/landed`, then `claude plugin install landed@landed`) asks for the installed app's executable, so contributors register the block and use the skill from the checkout. Then ask it for a resume; it reads your jobs and facts through Landed and submits its drafts through the same checks.

Integration tests open temporary database files; browser tests use the file named in `.env.test` and empty it first, never `data/landed.db`. Both use the fake model adapter (`LANDED_MODEL_PROVIDER=fake` in `.env.test`), so no key is ever needed for the checks listed in [CONTRIBUTING](../CONTRIBUTING.md).

Backup and restore:

```sh
pnpm db:backup                                 # writes backups/landed-<timestamp>.db; safe while the app runs
pnpm db:restore backups/landed-<timestamp>.db  # stop the app first; replaces the database file
```

`backups/` is ignored by Git but lives in the checkout; copy backups somewhere safe, together with the artifact directory.

Troubleshooting: "no such table" means the migrations were not applied: run `pnpm db:migrate` with the same `LANDED_DATABASE_PATH` as the app. Preserve the database file; do not delete or reseed it to recover startup.

To run the desktop shell from the checkout, `pnpm desktop:dev` builds and opens it with its own data in `data/desktop-dev`; `pnpm desktop:dist` writes installers to `release/` ([CONTRIBUTING](../CONTRIBUTING.md#desktop-app)).

## Moving data from a Docker/PostgreSQL install

The Docker Compose release and the PostgreSQL development database were removed under [ADR 013](adr/013-desktop-distribution.md). To move existing data into a checkout, keep the old PostgreSQL container running (from the old checkout), take a backup there first, then in the new checkout run:

```sh
pnpm install
pnpm import:postgres -- --from postgres://<user>:<password>@localhost:5432/landed [--to ./data/landed.db]
```

The importer only reads PostgreSQL (its session is read-only), creates and migrates the SQLite file, copies every table in one transaction, prints a row-count comparison per table and exits non-zero on any difference. It refuses a target file that already has a profile. The released installation published no database port, so map `5432` on `127.0.0.1` for the duration of the import, or run it against a contributor database. Copy the old artifact directory (the `landed-release_artifacts` volume, or `./artifacts`) to `LANDED_ARTIFACT_DIR` so stored PDFs and logos stay reachable. To use the imported file in the desktop app, quit the app and copy it over `data/landed.db` in the app's data folder, and the artifact directory over its `artifacts/`. Delete the old volumes only after checking the imported data in the app.

## Verification

Recorded in [doc 09](09-decisions-and-readiness.md#desktop-distribution-2026-10-02-implemented): `pnpm verify:full` on the desktop stack (253 unit tests, 113 integration tests, 12 browser journeys), a smoke test of the packaged app on macOS, and the release workflow's stdio smoke test against each packaged app. Not yet covered: signed builds, automatic install, and Windows stdio until the first tagged release. Phase 0 and 1a work offline; the app's own outbound requests are the configured provider, a logo address you paste and the launch-time release check. Paste-back and connected assistants may send the facts they receive to their own model providers.

Runtime data lives outside the source checkout, in the app's data folder. Ignore files are a second guard, not backup or access control. Installers include only the built app, the server and the migrations (`electron-builder.yml`), never the workspace or `.env` files.

## Reference lessons

[Resume Matcher SETUP](https://github.com/srbhr/Resume-Matcher/blob/main/SETUP.md) documents local development, provider setup, Docker, and troubleshooting. Its retrieved [.github/CONTRIBUTING.md](https://github.com/srbhr/Resume-Matcher/blob/main/.github/CONTRIBUTING.md) includes older setup paths inconsistent with that guide; verify current source before copying any commands. Our installation instructions have one owner: this document.

[ai-job-search](https://github.com/MadsLorentzen/ai-job-search) uses an installed agent environment and local tools. Its tracked profile-file approach introduces different contribution/privacy concerns than an app that stores user data outside Git. Borrow workflow ideas without inheriting that storage arrangement.

## Using profile tools (ADR 009)

Use the same Settings → Connect your assistant setup; after updating Landed, restart the assistant so it starts the new version. The merged profile extension provides `get_profile`, `create_profile`, `update_profile` and add/update/delete tools for each career-record type. Use the skill from the same checkout; a published plugin from an older release may still describe only the document workflow.

On an empty installation, ask “Create my profile with the name Morgan Example.” Then try “Add PostgreSQL to my skills,” “Put that skill in the Databases category,” and “Delete the PostgreSQL skill.” Refresh the Profile hub in the app to inspect each result. These examples are fictional; use an isolated local database for demonstrations. The profile workflow does not require a job or a model API key. Existing installations keep their data and configuration; whole-profile deletion is not exposed.

The user confirmed successful local assistant testing on 2026-09-17. Harness-specific coverage and packaged verification for this extension have not yet been recorded. The original connection verification above applies only to ADR 008.
