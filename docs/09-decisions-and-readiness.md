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
- Phase 1 is delivered as 1a (manual jobs, applications, status tracking, filters and sort; no new dependency) and 1b (generation, PDFs, model access). Decided 2026-09-14 with: `@react-pdf/renderer` added in 1b with the first PDF feature; Preparing included in the Needs attention filter; document blocks were inert "Not started" placeholders in 1a; any application status selectable at any time, with the submission time recorded on the first entry to `applied`; sort by updated (default) and added (doc 01, doc 05).
- Phase 1b decisions (2026-09-14, [ADR 006](adr/006-model-access-path.md), docs 04, 05, 06, [DESIGN-DOCS.md](../DESIGN-DOCS.md)):
  - Model access: the app calls a provider through one adapter interface over the Vercel AI SDK; providers `anthropic`, `openai`, `openrouter` (added 2026-09-14 as the OpenAI-compatible path with its base URL and cost reporting built in), `gateway` and `openai_compatible` (Ollama and similar by base URL), selected in the environment file only; a `fake` adapter for every automated check; paste-back mode as the zero-setup path. No key in the database or the browser.
  - Document content: Zod schemas for resume, cover letter and recruiter message, every unit carrying evidence ids that reference records in the run's frozen snapshot; budgets in the resume schema keep it to one page.
  - One resume template and one cover-letter layout: single column, Letter, Helvetica built in, monochrome, sentence-case headings (DESIGN-DOCS.md).
  - Execution and recovery: a bounded application-owned runner (the action awaits the call; the run row is committed first) with a sweep that marks runs older than ten minutes as interrupted. No worker before Phase 3.
  - Review: text edited in place on the preview, each save a new immutable revision; Mark reviewed records the time; Ready stays a manual application status; submission stays manual.
  - Grounding: a deterministic check after every generation (evidence ids exist, numbers appear in cited evidence, and since 2026-09-14 resume bullets cite only their own entry's records) shown as warning chips; a synthetic evaluation set in `examples/generation` run by `pnpm eval` against a real provider, and by the fake adapter in CI.
  - Observability: every model call writes a run record with provider, model, prompt name and version, tokens, latency, cost when reported and outcome, visible in a Runs column.
  - Profile gains a `links` list (LinkedIn, GitHub, website) with a migration, for the resume header.

## Proposed defaults

- A modular monolith with Profile first; Jobs and Applications in Phase 1a, Documents in Phase 1b.
- Input snapshots attached to generated materials, with saved document revisions but no achievement revisions.
- Structured document content in PostgreSQL; PDFs in a persistent local volume with database metadata.
- Provider support claims follow the evaluation set: a provider is listed as verified only after `pnpm eval` has been run against it; harness integration and phone or claude.ai access wait for their own designs.
- LangGraph as a later orchestration candidate after a small explicit implementation establishes requirements.

## Phase 0 complete (2026-09-13)

Implemented and tested: the Profile module, the first migration with the constraints from document 04, browser entry and editing of every Phase 0 record, integration and browser tests, backup/restore scripts, CI, a SECURITY policy, and the packaged Docker Compose installation with its launcher (ADR 003), tested on macOS. Known gaps, carried rather than blocking: no demo-data loader for `examples/demo-profile.json`; checkbox groups show the stored selection instead of the typed one after a validation error; an unreachable database gives a generic server error; profile deletion is in the schema but not in the interface; Windows, Linux and x86-64 installs are untested; a version-to-version upgrade with new migrations has not yet been exercised. The interface was rebuilt on 2026-09-14 (ADR 005) with the same data and tests; the toolbar's filter and sort slots stay empty until the Jobs list exists.

## Phase 1a complete (2026-09-14)

Implemented and tested: the Jobs and Applications modules with the shared result and error helpers in `src/modules/shared`; the second migration (jobs, applications); pasting a posting that creates its application in one transaction; manual status changes with notes and the recorded submission time; availability on the job; the Jobs list with the derived chip, its modifier, the four filters and the two sorts as search parameters; the Job description and Company columns; the inert document blocks; and job deletion cascading to the application. Verified with 37 unit tests, 28 integration tests against PostgreSQL and 3 browser journeys. Known gaps, carried rather than blocking: the Company block has no content of its own; no run or draft facts exist, so five rows of the chip table cannot yet appear; the filter and sort are applied in the browser over server-derived rows; the Phase 0 gaps above remain.

## Phase 1b complete (2026-09-14)

Implemented and tested: the Documents module (`generation_runs`, `documents`, `document_revisions`, `document_artifacts` in migration 0002, with `profiles.links` and the owner-aware key on applications); the model adapter interface with the AI SDK implementation for `anthropic`, `openai`, `gateway` and `openai_compatible`, the fixture-driven fake and the environment-only factory; paste-back mode; the grounding check with warning chips; the review column with inline editing, the Evidence, Paste back and Runs columns; the Model setup page; one-page resume and cover-letter PDFs stored as artifacts; the synthetic evaluation set behind `pnpm eval`; the run and draft facts feeding the Jobs chip. Verified with 86 unit tests, 41 integration tests against PostgreSQL and 4 browser journeys against the production build, every one with the fake adapter, plus the migration drift check. Known gaps, carried rather than blocking: only OpenRouter with `google/gemini-3.1-flash-lite` has been run through `pnpm eval` (2026-09-14, doc 06); header, headings, dates, greeting and closing are not editable in place; no drag-and-drop reordering; a Paste back visit creates a queued run (superseded on the next visit); the PowerShell launcher backs up the database but not the artifacts volume; submissions do not pin revisions; the Phase 0 and 1a gaps remain. Link import and scoring stay in Phase 2A; automatic generation and remote access are later phases.

## Deliberately deferred

Vector embeddings/indexes; separate vector storage; generalized agent framework; multi-provider support matrix; remote MCP; authentication for hosted use; queues/brokers; all job providers; comprehensive interviews. Reopen each when its phase or an observed requirement needs it.

## Decision records

- [ADR 001 — Local TypeScript application with PostgreSQL](adr/001-local-typescript-postgresql.md)
- [ADR 002 — Simple achievements and generation snapshots](adr/002-achievements-and-snapshots.md)
- [ADR 003 — Packaging and quickstart](adr/003-local-packaging.md)
- [ADR 004 — Drizzle for persistence](adr/004-drizzle-persistence.md)
- [ADR 005 — Interface as URL-driven columns](adr/005-url-driven-columns.md)
- [ADR 006 — Model access path](adr/006-model-access-path.md)
