# 09 — Decisions and implementation readiness

Updated 2026-09-14. Accepted decisions below reflect the user's explicit instructions. Recommendations remain proposals.

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
- Docker Compose user packaging with a one-shot migrate service and a shell/PowerShell launcher; Node plus a Compose database for development ([ADR 003](adr/003-local-packaging.md), implemented 2026-09-13).
- Interface layout: a persistent sidebar (drawer below 1200px), shifting columns driven by the URL path, no borders, three tonal steps, and a derived (never stored) job status chip ([ADR 005](adr/005-url-driven-columns.md), DESIGN.md, doc 05; implemented 2026-09-14).
- Phase 1 is delivered as 1a (manual jobs, applications, status tracking, filters and sort; no new dependency) and 1b (generation, PDFs, model access). Decided 2026-09-14 with: `@react-pdf/renderer` added in 1b with the first PDF feature; Preparing included in the Needs attention filter; document blocks shown as inert "Not started" placeholders until 1b; any application status selectable at any time, with the submission time recorded on the first entry to `applied`; sort by updated (default) and added (doc 01, doc 05).

## Proposed defaults

- A modular monolith with Profile first; Jobs and Applications in Phase 1a, Documents in Phase 1b.
- Input snapshots attached to generated materials, with saved document revisions but no achievement revisions.
- Structured document content in PostgreSQL; PDFs in a persistent local volume with database metadata.
- One supported model integration initially; optional harness/local model paths when tested.
- LangGraph as a later orchestration candidate after a small explicit implementation establishes requirements.

## Phase 0 complete (2026-09-13)

Implemented and tested: the Profile module, the first migration with the constraints from document 04, browser entry and editing of every Phase 0 record, integration and browser tests, backup/restore scripts, CI, a SECURITY policy, and the packaged Docker Compose installation with its launcher (ADR 003), tested on macOS. Known gaps, carried rather than blocking: no demo-data loader for `examples/demo-profile.json`; checkbox groups show the stored selection instead of the typed one after a validation error; an unreachable database gives a generic server error; profile deletion is in the schema but not in the interface; Windows, Linux and x86-64 installs are untested; a version-to-version upgrade with new migrations has not yet been exercised. The interface was rebuilt on 2026-09-14 (ADR 005) with the same data and tests; the toolbar's filter and sort slots stay empty until the Jobs list exists.

## Before Phase 1b code

Select the initial model access path, document JSON schema, one resume/cover-letter template, generation execution/recovery mechanism, review/submission transitions, and a small grounding evaluation set. Validate the desired harness integration if selected. Phase 1a needs none of these; also decide the execution model for generation runs (doc 05) before the first Documents module code. The PDF renderer is decided (`@react-pdf/renderer`) and is added with the first PDF feature.

## Deliberately deferred

Vector embeddings/indexes; separate vector storage; generalized agent framework; multi-provider support matrix; remote MCP; authentication for hosted use; queues/brokers; all job providers; comprehensive interviews. Reopen each when its phase or an observed requirement needs it.

## Decision records

- [ADR 001 — Local TypeScript application with PostgreSQL](adr/001-local-typescript-postgresql.md)
- [ADR 002 — Simple achievements and generation snapshots](adr/002-achievements-and-snapshots.md)
- [ADR 003 — Packaging and quickstart](adr/003-local-packaging.md)
- [ADR 004 — Drizzle for persistence](adr/004-drizzle-persistence.md)
- [ADR 005 — Interface as URL-driven columns](adr/005-url-driven-columns.md)
