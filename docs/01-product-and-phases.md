# 01 — Product and phases

Status: Phase 0 complete (2026-09-13); Phase 1a complete (2026-09-14); Phase 1b decided and in progress (2026-09-14); Phases 2 to 4 proposed. Updated 2026-09-14.

Landed is a locally run job-search application that produces factual, tailored materials and helps people manage applications. It must be usable without editing source code. Code can be cloned/forked independently of personal data. The shortest useful outcome is a reviewed resume, cover letter, and recruiter message for a real job.

## Phase 0 — Enter and retain career data

A user starts an empty installation, adds profile information, employment, education, projects, skills, and achievements through the browser, and finds the same records after restarting the app. No LLM account is required. Manual entry only; resume import is deferred.

Completion requires clear validation, basic editing/deletion, explicit saved/error feedback, persistent PostgreSQL storage, fictional example data, and a tested backup/restore procedure. These are reliability requirements for retaining user data, not a separate enterprise platform. A polished onboarding wizard and portable application-level import/export can follow if they delay the first useful flow.

Completed on 2026-09-13: browser entry and in-place editing of the profile, work history, education, projects, skills and achievements with skill links; field-level validation; stale-edit detection between tabs; restricted deletion of records that other facts depend on; backup and restore scripts; integration and browser tests against real PostgreSQL; and the packaged Docker Compose installation with its launcher, tested on macOS ([doc 07](07-quickstart-contract.md)). Known gaps carried into Phase 1: no loader for `examples/demo-profile.json` (the tests use its values directly); after a validation error, checkbox groups (work arrangement, skill links) show the stored selection rather than what was just ticked; an unreachable database surfaces as a generic server error rather than a friendly message; profile deletion exists in the schema but is not exposed in the interface; Windows and Linux installs are untested.

On 2026-09-14 the interface was rebuilt as URL-driven columns ([ADR 005](adr/005-url-driven-columns.md)): a sidebar with About me and Jobs, an About me hub with one card per record type (Profile, Work history, Education, Projects, Skills, Achievements), lists whose add control opens a blank form in the next column, and a Jobs section that stayed an empty state until Phase 1a filled it. Behaviour and data were unchanged by the rebuild.

## Phase 1 — Tailored application materials and tracking

User scope: create custom resumes, cover letters, and recruiter messages from career facts plus a pasted job description; retain them in the database; create PDFs; track application status.

Phase 1 is delivered in two parts (decided 2026-09-14). Phase 1a is the tracking half and needs no model, no PDF library and no new dependency. Phase 1b is the generation half.

### Phase 1a — Manual jobs and application tracking

The user pastes a job description with its title and company, and the application record exists from that moment. The user changes the application status by hand (`preparing`, `ready`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`, `accepted`), keeps freeform notes, and marks a job's availability. The Jobs list shows the derived status chip from document 05 with its filters (Needs attention, Active, Closed, All) and sort (updated, added). Any status can be selected at any time; the submission time is recorded the first time an application enters `applied` and is kept afterwards. This is milestone 1 below.

In the interface, the Jobs section lists postings; each pasted posting gets its application immediately, so in Phase 1 the list is the list of applications. Each job opens to its blocks: the job itself with the company name as its subtitle, a Job description block, a Company block, and one block per document. Company is text on the job until Phase 2 research gives it content of its own. In Phase 1a the Resume, Cover letter and Recruiter message blocks are inert placeholders marked "Not started"; they open nothing until Phase 1b.

Completed on 2026-09-14: a paste form (title, company, optional location and posting URL, the description as pasted) that writes the job and its application in one transaction; a status select with notes on the job column, recording the submission time the first time the status becomes `applied`; availability (active, expired, unknown) edited on the job and never touching the application; the Jobs list with the derived chip and its modifier, the filters Needs attention, Active, Closed and All, and the sort Updated and Added, both held in the address as search parameters; a Job description column for editing the posting and a Company column that is an empty state; the three inert document blocks; and deletion of a job, which removes its application. Known gaps carried into Phase 1b: the Company block has no content of its own; no run or draft facts exist yet, so the Crafting documents, Needs review, Evaluating, Assessed and Generation failed rows of the chip cannot appear; and the filter and sort are applied in the browser over rows the server derives, since a layout cannot read search parameters.

### Phase 1b — Generated materials and PDFs

Milestones 2 to 4 below. The decisions document 09 required before code were taken on 2026-09-14 ([ADR 006](adr/006-model-access-path.md), documents 04, 05 and 06, [DESIGN-DOCS.md](../DESIGN-DOCS.md)). In the interface, each document block on a job opens a review column. Its actions are Generate, which asks the configured model provider; Paste back, which shows the same prompt for the user to run in any assistant and paste the JSON answer into, so no provider setup is required; Mark reviewed; and, once PDFs exist, Download. Text is edited in place on the preview, each bullet or paragraph individually, and every edit is a new saved revision. Beside the text, an Evidence column lists the career records each bullet cites, and a Runs column shows every model call with its model, prompt version, tokens, latency and cost. A document card that has no configured provider offers "Set up a model", which opens a column explaining what to put in the environment file.

Generated content is checked by the application, not trusted: every bullet must cite records in the frozen input snapshot, and numbers that do not appear in the cited evidence are flagged with a warning chip for the user to fix or accept. The resume is strictly one page; the content schema carries the bullet and length budgets that make that possible, and the PDF uses the conservative single-column layout in DESIGN-DOCS.md. Reordering sections and bullets by drag and drop is a later refinement, not part of 1b.

Recommended implementation milestones:
1. Save the pasted job, create an application record, and support manual status changes (Phase 1a, done).
2. Generate, review and edit structured resume content with a frozen input snapshot per run, through the configured provider or paste-back.
3. Generate cover letter and recruiter-message content the same way; preserve completed work if another artifact fails.
4. Export resume and cover letter PDFs from saved content; support copyable recruiter text.

One resume template and one cover-letter layout initially. PDF rendering does not call an LLM. The user explicitly marks an application submitted; generating or downloading materials does not submit anything. Phase 1 completion includes a tested end-to-end application bundle, not just model text in a console.

## Phase 2 — Assisted import, matching, and research

2A: import URL/text, preserve source text, normalize fields, avoid duplicates, apply deterministic eligibility checks, and provide an explained assessment. Unknown compensation/eligibility stays unknown. Failed URL fetches offer paste-text fallback.

2B: research company/product/team/recruiters with sources, timestamps, uncertainty, and bounded effort. Research is optional and can fail without losing the job or blocking manual generation. A fixed workflow is the first baseline; agentic behavior is introduced where dynamic tool selection improves results.

This is the largest manually initiated phase: importing web content, ranking, and researching are separate capabilities. Ship 2A before waiting for all research dimensions to work. Job identity/deduplication begins with explicit source IDs/URLs, not title alone.

## Phase 3 — Scheduled discovery and automatic drafts

3A: start with one source, then fetch, normalize, deduplicate, persist, and assess jobs on a local schedule. Track last successful run, failed sources, and stale postings.

3B: automatically generate resume/cover-letter drafts only for qualifying new jobs, within user-set per-run job count and cost/time limits. Do not replace reviewed/submitted materials. Repeated execution must not create duplicate jobs or duplicate draft bundles. Nothing is automatically sent or submitted.

This phase needs durable work records, recovery after restart, retry limits, and bounded concurrency. A PostgreSQL-backed task mechanism is a candidate; no broker is mandated. Sleep/offline means paused discovery; define bounded catch-up behavior rather than generating an unlimited backlog on wake.

Discovered jobs appear in the same Jobs list as pursued ones, distinguished by the derived status chip (doc 05), not by a separate screen. Two decisions belong to this phase: automatic drafting needs an application record to attach documents to, so it creates one the user never chose, which must read "Needs review" rather than "Preparing"; and "not interested" on a discovered job needs a dismissed flag on the job, because the `withdrawn` application status implies a pursuit that never existed.

## Phase 4 — Detailed interview tracking

Add rounds, dates, participants, notes, tasks, outcomes, and preparation when useful. Phase 1 already supports an `interviewing` application status and freeform notes. Pull detailed interview tracking forward if actual interviews make it more valuable than further automation.

## Non-goals for the first release

Hosted accounts, billing, multi-user tenancy, automatic application submission, email sending, unrestricted agent filesystem/shell access, multiple frontend stacks, mandatory local model installation, and generalized plugin infrastructure.
