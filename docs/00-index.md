# 00 — Documentation index

Status: Phase 0 complete (career data entry, packaged Docker installation, column interface since 2026-09-14); Phase 1a complete (manual jobs and application tracking, 2026-09-14); Phase 1b complete (generated materials, review, PDFs, model access, 2026-09-14); Phase 1c additions to the paste flow complete (salary, company logo, word cloud, 2026-09-14); the assistant surface over MCP complete ([ADR 008](adr/008-assistant-surface-over-mcp.md), 2026-09-16); Phases 2 to 4 are design. Updated 2026-09-20.

Profile management under [ADR 009](adr/009-profile-management-over-mcp.md) is implemented and merged into `main`. See [current verification](09-decisions-and-readiness.md#profile-management-over-mcp-implemented).

Numbers establish reading order, not software release versions. Accepted choices are distinguished from proposals, and each document says which parts are implemented; a diagram describes the intended structure, and its labels say which phase each part belongs to.

| Document | Question answered | Status |
|---|---|---|
| [01 — Product and phases](01-product-and-phases.md) | What can users accomplish, and when? | Phases 0, 1a, 1b, the 1c additions and the assistant surface complete; Phases 2 to 4 proposed |
| [02 — Domain model](02-domain-model.md) | What do the product's concepts mean? | Vocabulary through the assistant surface in use; Phase 2 to 4 concepts proposed |
| [03 — System and modules](03-system-and-modules.md) | Where does code run, and who owns behavior? | Profile, Jobs and Applications modules, column interface and packaged runtime implemented; Documents module, model adapter and PDF rendering implemented; the `/mcp` endpoint and the host guard implemented |
| [04 — Data model](04-data-model.md) | How does PostgreSQL represent those concepts? | Phase 0, 1a, 1b and 1c schemas migrated (0000 to 0006) |
| [05 — Workflows and failures](05-workflows-and-failures.md) | What happens on success, failure, and retry? | Phases 0, 1a and 1b and the assistant run lifecycle implemented; Phase 2 and 3 workflows proposed |
| [06 — AI and integrations](06-ai-and-integrations.md) | How do models, harnesses, RAG, and agents fit? | Model access path implemented (ADR 006); OpenRouter run through the evaluation set; eight original tools implemented (ADR 008), plus 18 implemented profile tools (ADR 009); later integrations proposed |
| [07 — Quickstart](07-quickstart-contract.md) | How do you run it, and what does the packaged install guarantee? | Both paths tested on macOS; the assistant path tested from Claude Code on a contributor install, not yet in Docker; Windows and Linux untested |
| [08 — Contributions and documentation](08-contributions-and-documentation.md) | How do changes stay understandable and documented? | CI, conventions, the skill sync check and SECURITY in place |
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
| [008 — Assistant surface over MCP](adr/008-assistant-surface-over-mcp.md) | Your own assistant (Claude Code, Codex, Claude Desktop) drives Landed through a local MCP endpoint with a launcher-minted token; original scope: reads, drafts and adding a posting; Landed keeps validation, grounding and the run record | Accepted, implemented (2026-09-16) |
| [009 — Profile management over MCP](adr/009-profile-management-over-mcp.md) | Profile creation and partial updates; individual career-record CRUD with retry ids and version checks | Implemented and merged into `main` |
| [010 — Career browsing and skill context](adr/010-career-browsing-and-skill-context.md) | Expandable records, direct skill associations and derived context filters | Accepted, implementation merged (PRs #35–39) |

## Architecture diagrams

Diagrams are Mermaid blocks inside the numbered documents, so they render on GitHub and change in the same commit as the text they describe. Interface rules live in [DESIGN.md](../DESIGN.md); rules for the produced resume and cover-letter PDFs live in [DESIGN-DOCS.md](../DESIGN-DOCS.md).

- Local runtime and module boundaries: [03 — System and modules](03-system-and-modules.md).
- Core evidence relationships: [04 — Data model](04-data-model.md).

## Maintaining these documents

Change the relevant numbered document and its Mermaid diagram in the same change as the behavior/schema/dependency change. Record significant accepted decisions in an ADR. Keep one authoritative explanation per subject and link to it. No recurring background monitor is required.

Personal inputs and development notes must not be included in release artifacts.

## Profile management over MCP (implemented)

[ADR 009 — Profile management over MCP](adr/009-profile-management-over-mcp.md) extends ADR 008 with 18 tools: profile read/create/update and add/update/delete for roles, education, projects, skills and achievements. The implementation uses module-owned partial updates, required version checks, client ids for retries, serialized first-profile creation and individual-record deletion only. The portable skill routes profile tasks independently of jobs. Existing snapshots remain unchanged. No new provider access, dependency or schema migration was added for this extension.

Implementation and local assistant acceptance are complete; PR #33 is merged into `main`. See doc 09 for the verification details and remaining platform coverage. Do not infer that the original ADR 008 verification covers the additional tools. Contracts: [doc 06](06-ai-and-integrations.md#profile-tools-adr-009-implemented); workflow: [doc 05](05-workflows-and-failures.md#profile-management-from-an-assistant-adr-009-implemented).


## Career browsing refinement (implemented)

[ADR 010](adr/010-career-browsing-and-skill-context.md) adds expandable career cards, nested About me browsing, direct skill links to roles/projects and context filters (migration 0007). Desired roles use removable pills. Document controls use a header download action, evidence/run text links and an approval toggle. The implementation is merged into `main` through PRs #35–39; see doc 09 for validation status and remaining coverage gaps.
