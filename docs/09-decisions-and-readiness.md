# 09 — Decisions and implementation readiness

Updated 2026-09-13. Accepted decisions below reflect the user's explicit instructions. Recommendations remain proposals.

## Accepted

- TypeScript, Next.js/Node.js, PostgreSQL; local operation initially.
- Manual career data entry and durable storage in Phase 0; resume import later.
- Editable achievements without achievement-history/versioning functionality.
- Phase 1 includes resumes, cover letters, recruiter messages, saved materials, PDFs, and application tracking.
- Phase 2 includes URL/text import, explained scoring, and company/team/product/recruiter research.
- Phase 3 automates discovery and draft generation; Phase 4 adds detailed interview tracking.
- Prioritize an easy clean installation and fictional examples for other users.
- Drizzle ORM for schema, typed queries, and SQL migration files ([ADR 004](adr/004-drizzle-persistence.md)).
- Libraries: Zod for validation and structured model output, Vercel AI SDK for model access, @react-pdf/renderer for PDFs, Vitest and Playwright for tests, pnpm as the package manager.
- Node 22 LTS and PostgreSQL 17 as the supported runtime versions.
- GitHub Actions runs lint, typecheck, tests, build, and migration checks on every pull request.
- MIT license, copyright Luis Peregrino.
- Browser mutations use Next.js Server Actions that call module use cases; route handlers are added when a non-browser client needs them.
- Modules are written as plain functions over typed data; classes only where state and behavior belong together (see AGENTS.md).
- Numbered architecture documentation with Mermaid diagrams before implementation; keep them synchronized with relevant changes.
- Styling: own components with CSS Modules and design tokens in one stylesheet; no utility framework or component library (2026-09-13).
- Conventional Commits with a scope, and a What/Why/How/Testing pull-request template (2026-09-13).
- Stale-edit detection through `updated_at` as the version token; client-minted record ids for idempotent creates (2026-09-13, doc 05).

## Proposed defaults

- Docker Compose user packaging; Node + Compose database for development.
- A modular monolith with Profile first; Jobs/Documents/Applications in Phase 1.
- Input snapshots attached to generated materials, with saved document revisions but no achievement revisions.
- Structured document content in PostgreSQL; PDFs in a persistent local volume with database metadata.
- One supported model integration initially; optional harness/local model paths when tested.
- LangGraph as a later orchestration candidate after a small explicit implementation establishes requirements.

## Phase 0 status

Implemented and tested (2026-09-13): the Profile module, the first migration with the constraints from document 04, browser entry and editing of every Phase 0 record, integration and browser tests, backup/restore scripts, and CI. Remaining before Phase 0 is closed: the packaged Docker Compose installation and first-run launcher (ADR 003), a demo-data loader, a SECURITY policy, and a friendlier message when the database is unreachable.

## Before Phase 1 code

Select the initial model access path, document JSON schema, one resume/cover-letter template, PDF renderer, generation execution/recovery mechanism, review/submission transitions, and a small grounding evaluation set. Validate the desired harness integration if selected. No need to choose these before Phase 0 begins.

## Deliberately deferred

Vector embeddings/indexes; separate vector storage; generalized agent framework; multi-provider support matrix; remote MCP; authentication for hosted use; queues/brokers; all job providers; comprehensive interviews. Reopen each when its phase or an observed requirement needs it.

## Decision records

- [ADR 001 — Local TypeScript application with PostgreSQL](adr/001-local-typescript-postgresql.md)
- [ADR 002 — Simple achievements and generation snapshots](adr/002-achievements-and-snapshots.md)
- [ADR 003 — Packaging and quickstart](adr/003-local-packaging.md)
- [ADR 004 — Drizzle for persistence](adr/004-drizzle-persistence.md)
