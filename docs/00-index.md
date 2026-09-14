# 00 — Documentation index

Status: Phase 0 complete (career data entry, packaged Docker installation, column interface since 2026-09-14); Phase 1a complete (manual jobs and application tracking, 2026-09-14); Phase 1b and Phases 2 to 4 are design. Updated 2026-09-14.

Numbers establish reading order, not software release versions. Accepted choices are distinguished from proposals, and each document says which parts are implemented; a diagram describes the intended structure, and its labels say which phase each part belongs to.

| Document | Question answered | Status |
|---|---|---|
| [01 — Product and phases](01-product-and-phases.md) | What can users accomplish, and when? | Phase 0 and Phase 1a complete; Phase 1b and Phases 2 to 4 proposed |
| [02 — Domain model](02-domain-model.md) | What do the product's concepts mean? | Proposed vocabulary and rules |
| [03 — System and modules](03-system-and-modules.md) | Where does code run, and who owns behavior? | Profile, Jobs and Applications modules, column interface and packaged runtime implemented; Phase 1b modules proposed |
| [04 — Data model](04-data-model.md) | How does PostgreSQL represent those concepts? | Phase 0 and Phase 1a schemas migrated; Phase 1b sketch |
| [05 — Workflows and failures](05-workflows-and-failures.md) | What happens on success, failure, and retry? | Phase 0 and Phase 1a implemented; Phase 1b design |
| [06 — AI and integrations](06-ai-and-integrations.md) | How do models, harnesses, RAG, and agents fit? | Future integration policy proposed |
| [07 — Quickstart](07-quickstart-contract.md) | How do you run it, and what does the packaged install guarantee? | Both paths tested on macOS; Windows and Linux untested |
| [08 — Contributions and documentation](08-contributions-and-documentation.md) | How do changes stay understandable and documented? | CI, conventions and SECURITY in place |
| [09 — Decisions and readiness](09-decisions-and-readiness.md) | What is accepted, open, or deferred? | Current decision register |

## Decision records

| ADR | Decision | Status |
|---|---|---|
| [001 — Local TypeScript application with PostgreSQL](adr/001-local-typescript-postgresql.md) | Language, framework, database, local execution | Accepted, implemented |
| [002 — Simple achievements and generation snapshots](adr/002-achievements-and-snapshots.md) | Achievements edited in place; Phase 1 input snapshots | Achievements accepted and implemented; snapshots proposed |
| [003 — Local packaging and quickstart](adr/003-local-packaging.md) | Docker Compose release and launcher | Accepted, implemented |
| [004 — Drizzle for persistence](adr/004-drizzle-persistence.md) | Schema, queries and SQL migrations | Accepted, implemented |
| [005 — Interface as URL-driven columns](adr/005-url-driven-columns.md) | Path as navigation state, sidebar and shifting columns, derived job status | Accepted, implemented |

## Architecture diagrams

Diagrams are Mermaid blocks inside the numbered documents, so they render on GitHub and change in the same commit as the text they describe.

- Local runtime and module boundaries: [03 — System and modules](03-system-and-modules.md).
- Core evidence relationships: [04 — Data model](04-data-model.md).

## Maintaining these documents

Change the relevant numbered document and its Mermaid diagram in the same change as the behavior/schema/dependency change. Record significant accepted decisions in an ADR. Keep one authoritative explanation per subject and link to it. No recurring background monitor is required.

Personal inputs and development notes must not be included in release artifacts.
