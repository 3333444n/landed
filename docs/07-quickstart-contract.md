# 07 — Reliable quickstart contract

Status: proposed installation acceptance criteria, NOT working installation instructions. Updated 2026-09-13.

The repository currently contains design material only. Do not advertise a working command until the corresponding release is built and verified.

## Ordinary user path

Target: install Docker Desktop or a compatible Docker Engine/Compose environment, download a release bundle (cloning optional), start the packaged application, open its local URL, and enter data. No Node, Python, PostgreSQL CLI, paid AI account, or agent CLI is required for Phase 0.

The eventual Compose definition should use pinned release images, a database health check, a one-time migration task, and persistent named volumes for PostgreSQL and artifacts. Start the web service only after successful migrations. Publish its port to 127.0.0.1; keep the database on the private Compose network. Container-internal listening on all interfaces is different from publishing all host interfaces.

A small first-run launcher may initialize private configuration/credentials so users do not edit SQL or invent database credentials. It must not overwrite an existing configuration or reset data. Decide and test the concrete cross-platform launch method during implementation. Docker itself is a substantial prerequisite; do not market this as a native double-click install.

The app opens with a blank profile. An explicit demo action uses a separate demo installation/database or guarded empty-database seed. Never mix demo records into an existing personal profile or reset data during startup. Phase 1 provider configuration happens in the application or one clearly documented supported path.

## Contributor path

Fork/clone → install the documented Node version and locked dependencies → run PostgreSQL through Compose → apply migrations → start Next.js locally → optionally seed isolated fictional examples → run the same checks as CI. Use one package manager. Exact commands will be added after the scaffold exists; README and CONTRIBUTING will link here rather than duplicate them.

## Required verification before claiming easy setup

- Fresh install without pre-existing local dependencies beyond stated prerequisites.
- App readiness reflects both service health and successful migrations.
- Data survives process/container restart, image recreation, and supported application upgrade.
- Backup/restore works on a new installation; include artifact files when Phase 1 introduces them.
- Restart/stop never silently deletes volumes. Factory reset is separate and explicit.
- Helpful troubleshooting for Docker not running, occupied port, failed download, permission failure, database unavailable, migration failure, and low disk space.
- Pin supported versions and explain upgrade steps. Database major-version upgrades require an explicit procedure, not a floating image tag.
- Verify release images on intended CPU architectures and document tested macOS, Windows, and Linux setups. Mark untested platforms as unverified.
- Phase 0 works offline after installation; example data and tests require no provider key.

Store runtime data in volumes outside the source checkout. Ignore files are a second guard, not backup or access control. Release bundles include only an explicit allowlist of application assets; never package the entire workspace with personal files.

## Reference lessons

[Resume Matcher SETUP](https://github.com/srbhr/Resume-Matcher/blob/main/SETUP.md) documents local development, provider setup, Docker, and troubleshooting. Its retrieved [.github/CONTRIBUTING.md](https://github.com/srbhr/Resume-Matcher/blob/main/.github/CONTRIBUTING.md) includes older setup paths inconsistent with that guide; verify current source before copying any commands. Our installation instructions will have one owner.

[ai-job-search](https://github.com/MadsLorentzen/ai-job-search) uses an installed agent environment and local tools. Its tracked profile-file approach introduces different contribution/privacy concerns than an app that stores user data outside Git. Borrow workflow ideas without inheriting that storage arrangement.
