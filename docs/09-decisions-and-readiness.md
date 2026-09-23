# 09 — Decisions and implementation readiness

Updated 2026-09-17. Accepted decisions below reflect the user's explicit instructions. Recommendations remain proposals.

Current local feature: 42 MCP tools, including writing context, Companies and Job Sources under [ADR 011](adr/011-writing-company-context-and-job-sources.md), accepted locally as part of the integrated update, pending merge. The final section records this extension; dated milestone sections preserve their historical scope and test counts. Unimplemented later capabilities remain design only.

## Accepted

- TypeScript, Next.js/Node.js, PostgreSQL; local operation initially.
- Manual career data entry and durable storage in Phase 0; resume import later.
- Editable achievements without achievement-history/versioning functionality.
- Phase 1 includes resumes, cover letters, recruiter messages, saved materials, PDFs, and application tracking.
- Phase 2 includes URL/text import, explained scoring, and company/team/product/recruiter research.
- Phase 3 automates discovery and draft generation; Phase 4 adds detailed interview tracking.
- Prioritize an easy clean installation and fictional examples for other users.
- Drizzle ORM for schema, typed queries, and SQL migration files ([ADR 004](adr/004-drizzle-persistence.md)).
- Libraries: Zod for validation and structured model output, Vercel AI SDK for model access, `@modelcontextprotocol/server` for the assistant endpoint, @react-pdf/renderer for PDFs, lucide-react for interface icons, Vitest and Playwright for tests, pnpm as the package manager.
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
- Interface material and colour (decided 2026-09-14, after Phase 1b): a canvas lit by a glow in the accent's hue, layered glass (flat translucent fill, 1px gradient edge, no blur) on cards, panels and round buttons, Lucide icons in tiles beside every column title, card and sidebar item, icon-only Filter and Sort menus, a light/dark switch, and a palette layer (`src/app/palettes.css`: near-black and near-white neutrals, the accent and glow in one hue; `steel` is the only palette; another can be added as a block and tried with `?palette=<name>`). Rules in DESIGN.md.
- Phase 1 is delivered as 1a (manual jobs, applications, status tracking, filters and sort; no new dependency) and 1b (generation, PDFs, model access). Decided 2026-09-14 with: `@react-pdf/renderer` added in 1b with the first PDF feature; Preparing included in the Needs attention filter; document blocks were inert "Not started" placeholders in 1a; any application status selectable at any time, with the submission time recorded on the first entry to `applied`; sort by updated (default) and added (doc 01, doc 05).
- Phase 1b decisions (2026-09-14, [ADR 006](adr/006-model-access-path.md), docs 04, 05, 06, [DESIGN-DOCS.md](../DESIGN-DOCS.md)):
  - Model access: the app calls a provider through one adapter interface over the Vercel AI SDK; providers `anthropic`, `openai`, `openrouter` (added 2026-09-14 as the OpenAI-compatible path with its base URL and cost reporting built in), `gateway` and `openai_compatible` (Ollama and similar by base URL), selected in the environment file only; a `fake` adapter for every automated check; paste-back mode as the zero-setup path. No key in the database or the browser.
  - Document content: Zod schemas for resume, cover letter and recruiter message, every unit carrying evidence ids that reference records in the run's frozen snapshot; budgets in the resume schema keep it to one page.
  - One resume template and one cover-letter layout: single column, Letter, Helvetica built in, monochrome, uppercase section headings on rules, the page filled to the bottom margin by stretching gaps, never text (DESIGN-DOCS.md, refined 2026-09-15).
  - Execution and recovery: a bounded application-owned runner (the action awaits the call; the run row is committed first) with a sweep that marks runs older than ten minutes as interrupted. No worker before Phase 3.
  - Review: text edited in place on the preview, each save a new immutable revision; Mark reviewed records the time; Ready stays a manual application status; submission stays manual.
  - Grounding: a deterministic check after every generation (evidence ids exist, numbers appear in cited evidence, and since 2026-09-14 resume bullets cite only their own entry's records) shown as warning chips; a synthetic evaluation set in `examples/generation` run by `pnpm eval` against a real provider, and by the fake adapter in CI.
  - Observability: every model call writes a run record with provider, model, prompt name and version, tokens, latency, cost when reported and outcome, visible in a Runs column.
  - Profile gains a `links` list (LinkedIn, GitHub, website) with a migration, for the resume header.
- A modular monolith with Profile first, Jobs and Applications in Phase 1a, Documents in Phase 1b (proposed 2026-09-13, implemented and accepted 2026-09-14).
- Input snapshots attached to generated materials, with saved document revisions but no achievement revisions (ADR 002; implemented 2026-09-14).
- Structured document content in PostgreSQL; PDFs in a persistent local volume with database metadata (implemented 2026-09-14).
- Testing scope by behavioural blast radius with `pnpm check`, `pnpm verify` and `pnpm verify:full` (CONTRIBUTING "Checks", 2026-09-14).
- Phase 1c additions (decided 2026-09-14, after Phase 1b, when link import was parked): salary as one free-text field, shown and never parsed; a company logo as an uploaded image or a pasted image address (PNG, JPEG, WebP, SVG, up to 1 MB), stored as uploaded under the artifact directory and never hotlinked, chosen from the tile next to the form's title, and replacing the job's status icon on the list card and job header once present (the chip keeps the status word; DESIGN.md amended); a word cloud of plain frequencies, top 40, biggest in the middle, words matching the profile's skills highlighted in the accent, on the job column and live under the Description field ([ADR 007](adr/007-user-initiated-image-fetch.md) for the fetch).
- Assistant surface over MCP (decided and implemented 2026-09-16, [ADR 008](adr/008-assistant-surface-over-mcp.md), docs 03, 05, 06, 07, SECURITY):
  - The user's own assistant (Claude Code, Codex or Claude Desktop) drives Landed through a Streamable HTTP MCP endpoint at `/mcp` in the same Next.js process, using `@modelcontextprotocol/server` v2 directly. No second process, nothing on the internet.
  - A bearer token `LANDED_MCP_TOKEN` from the environment file only, minted by the launcher like the database password and appended to an existing `.env.release` on upgrade; shown in the browser only on the Connect your assistant column, because it protects local data the browser already shows. Host and Origin validation for the whole application, loopback names only until a remote design lists others.
  - Run mode `assistant` and revision source `assistant`; a brief opens a queued run, a submission finishes it, an invalid answer fails it with `pasted_invalid` and opens a fresh one; the newest brief from either surface supersedes an older queued run; queued runs are never swept (doc 05).
  - Original ADR 008 scope (extended by ADR 009 on the feature branch): tools call module operations through the composition layer, never SQL. Eight tools: `list_jobs`, `get_job`, `add_job`, `get_document_brief`, `submit_document`, `get_document`, `edit_unit`, `render_pdf` (`add_job` decided 2026-09-16: a client-minted `job_id` for idempotence, validation errors naming the tool's parameters, and link intake left to the harness, which fetches the page with its own tools respecting robots.txt and passes the text; Landed never fetches a posting page); no deletion, no application status change, no profile write. The assistant's model writes and Landed validates, checks grounding and records the run, with provider and model recorded from what the client reports (doc 06).
  - Settings becomes a hub with two cards, Model setup and Connect your assistant; a portable skill under `.agents/skills` with a Claude Code plugin wrapping it; the fit evaluation and a reviewer pass live in the skill, not in Landed.
  - Kept as they were: the API key path, paste-back, the fake adapter for every check; `pnpm verify` exercises the endpoint in process with the MCP client and no model.

## Proposed defaults

- Provider support claims follow the evaluation set: a provider is listed as verified only after `pnpm eval` has been run against it; phone or claude.ai access waits for its own design, which reuses the local assistant endpoint of ADR 008 behind a tunnel with authentication.
- LangGraph as a later orchestration candidate after a small explicit implementation establishes requirements.

## Phase 0 complete (2026-09-13)

Implemented and tested: the Profile module, the first migration with the constraints from document 04, browser entry and editing of every Phase 0 record, integration and browser tests, backup/restore scripts, CI, a SECURITY policy, and the packaged Docker Compose installation with its launcher (ADR 003), tested on macOS. Known gaps, carried rather than blocking: no demo-data loader for `examples/demo-profile.json`; checkbox groups showed the stored selection instead of the typed one after a validation error (achievement skills are addressed in the UI refinement below, pending merge); an unreachable database gives a generic server error; profile deletion is in the schema but not in the interface; Windows, Linux and x86-64 installs are untested; a tagged version-to-version upgrade has not yet been exercised; the migration upgrade path was verified in Phase 1b (doc 07). The interface was rebuilt on 2026-09-14 (ADR 005) with the same data and tests; the toolbar's originally empty filter and sort slots were filled by the Phase 1a Jobs list.

## Phase 1a complete (2026-09-14)

Implemented and tested: the Jobs and Applications modules with the shared result and error helpers in `src/modules/shared`; the second migration (jobs, applications); pasting a posting that creates its application in one transaction; manual status changes with notes and the recorded submission time; availability on the job; the Jobs list with the derived chip, its modifier, the four filters and the two sorts as search parameters; the Job description and Company columns; the inert document blocks; and job deletion cascading to the application. Verified with 37 unit tests, 28 integration tests against PostgreSQL and 3 browser journeys. Known gaps, carried rather than blocking: the Company block has no content of its own; run and draft facts were absent at this milestone, then implemented in Phase 1b; the filter and sort are applied in the browser over server-derived rows; the Phase 0 gaps above remain.

## Phase 1b complete (2026-09-14)

Implemented and tested: the Documents module (`generation_runs`, `documents`, `document_revisions`, `document_artifacts` in migration 0002, with `profiles.links` and the owner-aware key on applications); the model adapter interface with the AI SDK implementation for `anthropic`, `openai`, `gateway` and `openai_compatible`, the fixture-driven fake and the environment-only factory; paste-back mode; the grounding check with warning chips; the review column with inline editing, the Evidence, Paste back and Runs columns; the Model setup page; one-page resume and cover-letter PDFs stored as artifacts; the synthetic evaluation set behind `pnpm eval`; the run and draft facts feeding the Jobs chip. Verified with 86 unit tests, 41 integration tests against PostgreSQL and 4 browser journeys against the production build, every one with the fake adapter, plus the migration drift check. Known gaps, carried rather than blocking: only OpenRouter with `google/gemini-3.1-flash-lite` has been run through `pnpm eval` (2026-09-14, doc 06); header, headings, dates, greeting and closing are not editable in place; no drag-and-drop reordering; a Paste back visit creates a queued run (superseded on the next visit); the PowerShell launcher backs up the database but not the artifacts volume; submissions do not pin revisions; the unresolved Phase 0 and 1a gaps remain; the missing run/draft facts were resolved in this phase. Link import and scoring stay in Phase 2A; automatic generation and remote access are later phases.

## Phase 1c additions complete (2026-09-14)

After a probe showed a major job board refusing plain server fetches of its posting pages, link import stayed in Phase 2A and three smaller additions to the paste flow were decided: a free-text salary on the job (never parsed; migration 0003); a company logo chosen from the column's tile as an uploaded image or a pasted image address, stored as a file under the artifact directory and shown in place of the job's status icon (migration 0004, [ADR 007](adr/007-user-initiated-image-fetch.md) for the fetch); and a word cloud of the posting on the job column and live under the Description field of the paste and edit forms, with the profile's skills highlighted. Verified at the top of the stack with 118 unit tests, 45 integration tests against PostgreSQL and 4 browser journeys against the production build, plus the migration drift check. Known gaps: an uploaded image has to be chosen again after a validation error, because files do not round-trip through the form state; the logo address fetch resolves the name once and connects again, so a name whose answer changes in between is not caught; images are stored as uploaded, never resized, so a large logo stays large on disk (the 1 MB cap bounds it); the word cloud counts single words only.

## Phase 1b iteration (2026-09-14)

Merged the same day as Phase 1b, after the first run against a real provider: the `openrouter` provider (base URL built in, usage accounting requested so cost is recorded), one copyable setup block per provider on the Model setup page, in both environment examples and in doc 07; the document schema sent to providers without length keywords (`portable-schema.ts`), because Google rejected the resume schema and OpenAI's strict mode would; `pnpm eval` failing on provider errors as well as validation failures; the `misattributed_evidence` grounding warning and prompt version 2; the `check` / `verify` / `verify:full` scripts with the migration drift script shared with CI; the README rewrite. Verified with 91 unit tests, 41 integration tests, 4 browser journeys, and `pnpm eval` against OpenRouter (doc 06). Gaps added: the lite model leaves the resume budget unused and sometimes merges two facts of one role into a bullet; a stronger model has not been evaluated.

## Resume refinement (2026-09-15)

Template version 2 after comparing the output with a dense one-page reference: 24 pt name, 12 pt uppercase section headings on a 2 pt rule, 0.5 in margins, black only, bold dates, a Summary heading, no hyphenation, and `fitResume`, which finds by bisection the largest gap scale (up to 2.4) that still renders one page, so the resume ends at the bottom margin. Budgets raised to 7 entries and 12 bullets and counted in printed lines: `helvetica.ts` carries the built-in font's metrics and `layoutCheck` adds the `wraps_line` warning for a bullet, subheading, skills line or contact line that would wrap, or a summary past three lines. Prompt v3 asks for bullets of 108 to 114 characters and the whole budget and fixes the contact line to phone, email, location, LinkedIn and GitHub. Employment records gain a `location` (migration 0005, a field on the Work history form, carried by the snapshot and the resume entry, printed right-aligned on the role line; prompt v4). `pnpm eval` re-run for each prompt version (doc 06). Known gap: the lite model returns 8 to 10 bullets against a budget of 12, so a thin run stops stretching at the cap and leaves a band at the bottom; regenerate or use a stronger model.

## Assistant surface complete (2026-09-16)

Implemented and tested under [ADR 008](adr/008-assistant-surface-over-mcp.md), as a stack of small pull requests documented in docs 03, 05, 06, 07 and SECURITY ahead of the code: `LANDED_MCP_TOKEN` and `LANDED_ALLOWED_HOSTS` in the configuration; the Host and Origin guard (`src/proxy.ts` over `src/infrastructure/host-guard.ts`) on every request; the `assistant` run mode and revision source (migration 0006) with the brief and reopen composition functions; the `/mcp` endpoint (`src/app/mcp/`) with the eight tools `list_jobs`, `get_job`, `add_job`, `get_document_brief`, `submit_document`, `get_document`, `edit_unit` and `render_pdf`, 503 without a token and 401 on a wrong bearer; the Settings hub with the Connect your assistant column (one copyable block per assistant, the only place the token is shown) and the `CopyButton`; the launcher minting the token on first `start`, appending it on upgrade, and the `token` command; the portable skill at `.agents/skills/landed/SKILL.md` and the Claude Code plugin at `plugins/landed/` published through `.claude-plugin/marketplace.json`, kept identical by `scripts/check-skill-sync.sh` in `pnpm check`. Verified with 144 unit tests, 56 integration tests against PostgreSQL (the endpoint driven in process with the MCP client) and 6 browser journeys against the production build, plus the migration drift check, and used end to end from Claude Code on a contributor install on 2026-09-16: a posting added through `add_job` and the three documents written, submitted and rendered through the endpoint. Known gaps, carried rather than blocking: the packaged path (the launcher's token on a fresh and an upgraded `.env.release`, the endpoint inside the container) has not been exercised in Docker, so doc 07 lists it as untested; the provider and model on an assistant run are self-reported by the client, and the Runs column shows them as reported, not verified; `edit_unit` addresses the recruiter message body but not its subject, which changes only through a resubmission; the Codex and Claude Desktop blocks are written from their vendors' documentation and not run end to end; remote access from claude.ai or a phone is a later design that reuses the endpoint behind a tunnel.

## Deliberately deferred

Vector embeddings/indexes; separate vector storage; generalized agent framework; multi-provider support matrix; remote MCP (local MCP is decided in ADR 008; remote access from claude.ai or a phone is a later ADR that reuses the same endpoint behind a tunnel); authentication for hosted use; queues/brokers; all job providers; comprehensive interviews; automatic import from a posting link in the app, after a probe showed that major job boards refuse plain server fetches (Phase 2A keeps the design, with paste as the fallback; assistant users get link intake through their harness and `add_job` instead, 2026-09-16); filling the paste form's fields from a whole copied posting page (designed on 2026-09-14, deferred to a later session). Reopen each when its phase or an observed requirement needs it.

## Decision records

- [ADR 001 — Local TypeScript application with PostgreSQL](adr/001-local-typescript-postgresql.md)
- [ADR 002 — Simple achievements and generation snapshots](adr/002-achievements-and-snapshots.md)
- [ADR 003 — Packaging and quickstart](adr/003-local-packaging.md)
- [ADR 004 — Drizzle for persistence](adr/004-drizzle-persistence.md)
- [ADR 005 — Interface as URL-driven columns](adr/005-url-driven-columns.md)
- [ADR 006 — Model access path](adr/006-model-access-path.md)
- [ADR 007 — User-initiated image fetch](adr/007-user-initiated-image-fetch.md)
- [ADR 008 — Assistant surface over MCP](adr/008-assistant-surface-over-mcp.md)
- [ADR 009 — Profile management over MCP](adr/009-profile-management-over-mcp.md): typed profile and individual-record operations, partial updates, retry ids and required version checks; locally accepted on this branch, pending merge.

## Profile management over MCP (accepted, pending merge)

[ADR 009 — Profile management over MCP](adr/009-profile-management-over-mcp.md) extends ADR 008 with 18 tools: profile read/create/update and add/update/delete for roles, education, projects, skills and achievements. The feature branch uses module-owned partial updates, required version checks, client ids for retries, serialized first-profile creation and individual-record deletion only. The portable skill routes profile tasks independently of jobs. Existing snapshots remain unchanged. No provider access, dependency or schema migration was added for this extension.

Implemented and locally accepted on the feature branch; merge remains pending, so this is not a released feature. `pnpm verify:full` passed on 2026-09-17: 145 unit tests, 76 integration tests, migration consistency, the production build and 8 browser journeys. The new browser journey exercises profile mutations through the authenticated HTTP endpoint and observes them in About me. The user confirmed successful local assistant testing on 2026-09-17. The harness-specific acceptance matrix is not yet recorded; this does not establish verification for every supported client or for the packaged installation. The same verification includes the theme-script fix and direct delivery of the static brand images without bypassing the Host guard. Contracts: [doc 06](06-ai-and-integrations.md#profile-tools-adr-009-feature-branch-pending-merge); workflow: [doc 05](05-workflows-and-failures.md#profile-management-from-an-assistant-adr-009-pending-merge).

## Achievement UI refinement (2026-09-18, pending merge)

Achievement statements use regular body typography (15/22, weight 400). A shared controlled `Combobox` supports searchable single or multiple selection, labelled listbox options, keyboard navigation and hidden form inputs. Achievement skills use multiple selection and preserve both selected and cleared values across validation errors. The public component contract is in DESIGN.md; reuse and state ownership guidance is in AGENTS.md. No dependency, schema, module operation or Server Action changes are required.

Implementation is locally accepted and pending merge. `pnpm verify:full` passed on 2026-09-18: 145 unit tests, 76 integration tests, migration consistency, the production build and all 8 browser journeys. The achievement journey covers search, no matches, keyboard selection, regular card typography, saving and reloading, and preserving both selected and cleared skills across validation errors. All model calls in the checks use the fake adapter.


## Personal and company writing context (2026-09-23, local implementation)

[ADR 011](adr/011-writing-company-context-and-job-sources.md) records the accepted scope: Profile/General info naming, an optional About me narrative, application Interest, shared Companies with sourced findings, and customizable Job Sources. Companies have only Name, Location, Website, About and Findings. Up to five findings are selected per job; all company fields are available to cover letters. Existing jobs remain unlinked. People and built-in research remain deferred.

Cover letters target three or four body sentences and retain the single-column monochrome PDF. Career evidence and context citations stay distinct, with context-only number attribution explicitly flagged for review. Source lists begin empty and archive preserves existing assignments. Browser and MCP support the same operations; this branch extends the endpoint to 42 tools.

Implementation is local, accepted locally as part of the integrated update, pending merge. No PR is opened before the user reviews the combined preview. Verification results for this extension must be recorded after integrated checks; earlier milestone counts are not evidence for these changes. No personal sourcebook import, data reset or remote service exposure is part of this work.

### Real-provider evaluation, 2026-09-23 (local context branch)

Final synthetic `pnpm eval`: OpenRouter / `google/gemini-3.1-flash-lite`, nine schema checks passed. Each generated cover-letter PDF rendered on one Letter page; the fit-case PDF was visually reviewed as a single column with no clipping. The body target is guidance plus a review warning, not an automatic rewrite. The fit letter had five sentences and was correctly flagged; the other letters had three and four sentences. Shorter than 80 words is allowed.

| Case | Document | Warnings | Input tokens | Output tokens | Body words | Latency ms | Cost USD |
|---|---|---|---:|---:|---:|---:|---:|
| fit | resume | none | 3123 | 799 | — | 3055 | 0.00197925 |
| fit | cover_letter | letter_length=1 | 2443 | 383 | 100 | 1983 | 0.00118525 |
| fit | recruiter_message | none | 1885 | 237 | — | 1582 | 0.00082675 |
| mismatch | resume | none | 3123 | 934 | — | 3585 | 0.00218175 |
| mismatch | cover_letter | none | 2170 | 266 | 72 | 1741 | 0.0009415 |
| mismatch | recruiter_message | none | 1885 | 235 | — | 1768 | 0.00082375 |
| partial-fit | resume | none | 3120 | 862 | — | 3089 | 0.002073 |
| partial-fit | cover_letter | none | 2167 | 233 | 75 | 2444 | 0.00089125 |
| partial-fit | recruiter_message | none | 1882 | 124 | — | 1420 | 0.0006565 |

An earlier evaluation of this prompt iteration returned one fit-letter schema validation failure; a targeted repeat and the final full run passed. Provider output is nondeterministic. Saved drafts still need review for semantic attribution, tone and brevity; zero grounding warnings do not prove every claim is supported. `EVAL_REPORT_PATH` optionally saves the synthetic evaluation report and generated letter PDFs for inspection.

### Integrated local validation, 2026-09-23

`pnpm verify:full` passed on the integrated context branch: formatting, lint, types, 159 unit tests, skill synchronization, 98 PostgreSQL integration tests, migration consistency, production build and all 10 Chromium browser journeys. The browser journeys include Profile narratives, Interest, shared company findings, protected deletion and Source archive/restore. Fictional Companies and Interest screenshots were visually reviewed. Tests use the isolated test database and fake provider; the separate real-provider evaluation is recorded above. Local acceptance completed with the canonical-company follow-up; publication is approved, with merge pending.
