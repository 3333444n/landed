# 01 — Product and phases

Status: user scope recorded; subdivisions and acceptance details proposed. Updated 2026-09-13.

Landed is a locally run job-search application that produces factual, tailored materials and helps people manage applications. It must be usable without editing source code. Code can be cloned/forked independently of personal data. The shortest useful outcome is a reviewed resume, cover letter, and recruiter message for a real job.

## Phase 0 — Enter and retain career data

A user starts an empty installation, adds profile information, employment, education, projects, skills, and achievements through the browser, and finds the same records after restarting the app. No LLM account is required. Manual entry only; resume import is deferred.

Completion requires clear validation, basic editing/deletion, explicit saved/error feedback, persistent PostgreSQL storage, fictional example data, and a tested backup/restore procedure. These are reliability requirements for retaining user data, not a separate enterprise platform. A polished onboarding wizard and portable application-level import/export can follow if they delay the first useful flow.

## Phase 1 — Tailored application materials and tracking

User scope: create custom resumes, cover letters, and recruiter messages from career facts plus a pasted job description; retain them in the database; create PDFs; track application status.

Recommended implementation milestones:
1. Save the pasted job, create an application record, and support manual status changes.
2. Generate and edit structured resume content with supporting input snapshots.
3. Generate cover letter and recruiter-message content; preserve completed work if another artifact fails.
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

## Phase 4 — Detailed interview tracking

Add rounds, dates, participants, notes, tasks, outcomes, and preparation when useful. Phase 1 already supports an `interviewing` application status and freeform notes. Pull detailed interview tracking forward if actual interviews make it more valuable than further automation.

## Non-goals for the first release

Hosted accounts, billing, multi-user tenancy, automatic application submission, email sending, unrestricted agent filesystem/shell access, multiple frontend stacks, mandatory local model installation, and generalized plugin infrastructure.
