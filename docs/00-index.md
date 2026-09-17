# 00 — Documentation index

Status: Phase 0 complete (career data entry, packaged Docker installation, column interface since 2026-09-14); Phase 1a complete (manual jobs and application tracking, 2026-09-14); Phase 1b complete (generated materials, review, PDFs, model access, 2026-09-14); Phase 1c additions to the paste flow complete (salary, company logo, word cloud, 2026-09-14); the assistant surface over MCP decided and in progress ([ADR 008](adr/008-assistant-surface-over-mcp.md), 2026-09-16); Phases 2 to 4 are design. Updated 2026-09-16.

Numbers establish reading order, not software release versions. Accepted choices are distinguished from proposals, and each document says which parts are implemented; a diagram describes the intended structure, and its labels say which phase each part belongs to.

| Document | Question answered | Status |
|---|---|---|
| [01 — Product and phases](01-product-and-phases.md) | What can users accomplish, and when? | Phases 0, 1a, 1b and the 1c additions complete; Phases 2 to 4 proposed |
| [02 — Domain model](02-domain-model.md) | What do the product's concepts mean? | Vocabulary through Phase 1b in use; Phase 2 to 4 concepts proposed |
| [03 — System and modules](03-system-and-modules.md) | Where does code run, and who owns behavior? | Profile, Jobs and Applications modules, column interface and packaged runtime implemented; Documents module, model adapter and PDF rendering implemented |
| [04 — Data model](04-data-model.md) | How does PostgreSQL represent those concepts? | Phase 0, 1a and 1b schemas migrated |
| [05 — Workflows and failures](05-workflows-and-failures.md) | What happens on success, failure, and retry? | Phases 0, 1a and 1b implemented; Phase 2 and 3 workflows proposed |
| [06 — AI and integrations](06-ai-and-integrations.md) | How do models, harnesses, RAG, and agents fit? | Model access path implemented (ADR 006); OpenRouter run through the evaluation set; the assistant surface and its tool contract decided (ADR 008, in progress); later integrations proposed |
| [07 — Quickstart](07-quickstart-contract.md) | How do you run it, and what does the packaged install guarantee? | Both paths tested on macOS; Windows and Linux untested |
| [08 — Contributions and documentation](08-contributions-and-documentation.md) | How do changes stay understandable and documented? | CI, conventions and SECURITY in place |
| [09 — Decisions and readiness](09-decisions-and-readiness.md) | What is accepted, open, or deferred? | Current decision register |

## Decision records

| ADR | Decision | Status |
|---|---|---|
| [001 — Local TypeScript application with PostgreSQL](adr/001-local-typescript-postgresql.md) | Language, framework, database, local execution | Accepted, implemented |
| [002 — Simple achievements and generation snapshots](adr/002-achievements-and-snapshots.md) | Achievements edited in place; Phase 1b input snapshots | Accepted, implemented (snapshots since Phase 1b) |
| [003 — Local packaging and quickstart](adr/003-local-packaging.md) | Docker Compose release and launcher | Accepted, implemented |
| [004 — Drizzle for persistence](adr/004-drizzle-persistence.md) | Schema, queries and SQL migrations | Accepted, implemented |
| [005 — Interface as URL-driven columns](adr/005-url-driven-columns.md) | Path as navigation state, sidebar and shifting columns, derived job status | Accepted, implemented |
| [006 — Model access path](adr/006-model-access-path.md) | App calls a provider through one adapter; env-only configuration; paste-back mode; fake adapter for checks | Accepted, implemented |
| [007 — User-initiated image fetch](adr/007-user-initiated-image-fetch.md) | The one outbound call besides the provider: a logo address the user pastes, fetched once through a guarded fetcher and stored | Accepted, implemented |
| [008 — Assistant surface over MCP](adr/008-assistant-surface-over-mcp.md) | Your own assistant (Claude Code, Codex, Claude Desktop) drives Landed through a local MCP endpoint with a launcher-minted token; reads and drafts only; Landed keeps validation, grounding and the run record | Accepted, implementation in progress |

## Architecture diagrams

Diagrams are Mermaid blocks inside the numbered documents, so they render on GitHub and change in the same commit as the text they describe. Interface rules live in [DESIGN.md](../DESIGN.md); rules for the produced resume and cover-letter PDFs live in [DESIGN-DOCS.md](../DESIGN-DOCS.md).

- Local runtime and module boundaries: [03 — System and modules](03-system-and-modules.md).
- Core evidence relationships: [04 — Data model](04-data-model.md).

## Maintaining these documents

Change the relevant numbered document and its Mermaid diagram in the same change as the behavior/schema/dependency change. Record significant accepted decisions in an ADR. Keep one authoritative explanation per subject and link to it. No recurring background monitor is required.

Personal inputs and development notes must not be included in release artifacts.
