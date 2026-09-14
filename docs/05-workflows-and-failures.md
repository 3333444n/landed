# 05 — Workflows and failures

Status: Phase 0 save and Phase 1a paste-and-track implemented; Phase 1b proposed. Updated 2026-09-14.

## Phase 0 save

Browser submits a profile-owned record → server validates input and owner context → module checks rules → transaction writes record and relationships → commit → UI displays the saved result. Refresh reads the committed record.

Invalid input produces field errors with no write, and the form keeps what was typed. A lost response after a successful insert must not create a duplicate on retry: the form mints the record id before submitting, and a repeat with the same id returns the existing record. Relationship writes (achievement plus skill links) happen in one transaction and roll back together. Concurrent browser tabs detect stale saves through the record's `updated_at` sent back as a hidden field; a mismatch refuses the write and asks the user to reload. Database unavailability currently surfaces as a server error; a friendlier retry message is a known gap.

## Phase 1a paste and track

Browser submits a pasted posting with a client-minted job id → server validates → one transaction writes the job and its `preparing` application (the two module use cases nest as savepoints inside it) → commit → the job column opens beside the list. A retry with the same id returns the existing job. The user changes the status and notes by hand on the job column; the first change to `applied` records `submitted_at`, and later changes keep it. Availability is edited on the job and never touches the application. Deleting a job removes its application in the same statement.

## Phase 1b generation

Save original pasted posting and application → collect career facts → freeze the selected inputs → generate structured drafts → validate shape and evidence references → save each completed document revision → review/edit → render requested PDFs → explicitly mark application submitted with exact material references.

Pasted text can be used directly before full job extraction/matching exists. A minimal Job record belongs in Phase 1; URL import and scoring do not. Do not hold an SQL transaction open across model calls or PDF rendering. Persist outcomes between expensive operations. If one artifact fails, show which artifact failed and retain completed siblings.

Run states: queued, running, succeeded, partially_succeeded, failed, cancelled. Start with the simplest execution model that survives the actual runtime behavior. Before Phase 1b implementation, decide between a bounded application-owned runner with interrupted-run detection and a PostgreSQL-backed worker. Next.js request lifetime or an unawaited promise is not a durability guarantee. Phases 0 and 1a need neither runner.

On restart, unfinished work is visibly interrupted/recoverable, never reported as successful. Retry bounded transient failures; validation failures require correction rather than unlimited retries. An exact replay must not duplicate artifacts. Persist PDF metadata only after an atomic file write; reconcile orphaned files and pending artifact rows after crashes.

## Separate lifecycles

Applications: proposed statuses `preparing`, `ready`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`, `accepted`. Ready means user-reviewed materials; a successful model call alone does not make it ready. Users may import an already-applied pursuit without generating materials. Define normal transitions plus an explicit correction action rather than preventing legitimate data entry. Detailed interview rounds wait until Phase 4.

Job availability: active / expired / unknown. Generation run state is independent. A job expiring must not move an application out of interviewing. Later matching/research records do not overwrite pursuit status.

## Derived job status in the interface

The Jobs list shows one status chip per job so the user can watch a posting move from discovered to applied in a single list. That chip is never stored. It is a pure function of the independent facts above (job availability, application status if an application exists, the latest run state for the job, and whether unreviewed document revisions exist), evaluated when the list renders. First matching row wins:

| Facts | Chip | Tone |
|---|---|---|
| Application in `ready`, `applied`, `interviewing`, `offer` or `accepted` | that status word | success |
| Application in `rejected` or `withdrawn` | that status word | neutral |
| Application `preparing`, generation run queued or running | Crafting documents | accent |
| Application `preparing`, unreviewed drafts exist | Needs review | warning |
| Application `preparing`, otherwise | Preparing | neutral |
| No application, matching run queued or running (Phase 2) | Evaluating | accent |
| No application, match assessment exists (Phase 2) | Assessed | neutral |
| No application, no run | New | accent |

At most one modifier chip follows: "Posting expired" (warning) when availability is expired while the application is active, or "Generation failed" (warning) when the latest run failed. An expired job with no application is hidden by the default filter, never deleted. List filters: Needs attention (default: New, Preparing, Needs review, Generation failed, Posting expired), Active (every non-terminal status), Closed (rejected, withdrawn, accepted, and expired postings without an application), All. Preparing belongs to the default filter because a freshly pasted job has nothing but a preparing application, and the default view must show it (decided 2026-09-14). Sort: updated (default), added, and next interview date once Phase 4 exists. Filters and sort live in the address as search parameters (ADR 005); changing either changes nothing in the database.

Phase 1a implements the function with every row and feeds it the application rows; the run and draft facts are constant (no run, no drafts) until Phase 1b, and Phase 2 and 3 add the assessment facts without changing the function's shape. The server derives every row's status when the list renders; the filter and sort are search parameters applied in the browser over those rows, because a Next.js App Router layout cannot read search parameters.

## Minimum checks

Phase 0 (implemented in `tests/`): save/reload across restart; input and FK constraints; transactional failure; stale update behavior; restricted deletes; private data separation through the isolated `landed_test` database; backup/restore scripts. Clean install is verified by CI on a fresh runner.

Phase 1a (implemented in `tests/`): the paste writes job and application together and replays the same id; blank fields write nothing; status changes record `submitted_at` once; stale tokens are refused; availability never moves the application; deleting a job removes its application; one unit test per row of the chip table and per filter; one browser journey from paste to delete.

Phase 1b: factual-claim support, unknown evidence IDs, unsupported metrics, preserved document inputs after profile edits, partial provider failures, retries, and extractable/readable PDF output. Fixed synthetic cases exercise behavior without paid model calls; a small optional real-model evaluation set tracks quality. Record prompt/model identity and available usage without assuming every runtime reports cost/tokens.

Logs identify operation/run and error category without copying career content or secrets by default. Add diagnostic detail as needed; no external observability account is a quickstart prerequisite.
