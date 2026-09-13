# 05 — Workflows and failures

Status: Phase 0 save behaviour implemented; Phase 1 proposed. Updated 2026-09-13.

## Phase 0 save

Browser submits a profile-owned record → server validates input and owner context → module checks rules → transaction writes record and relationships → commit → UI displays the saved result. Refresh reads the committed record.

Invalid input produces field errors with no write, and the form keeps what was typed. A lost response after a successful insert must not create a duplicate on retry: the form mints the record id before submitting, and a repeat with the same id returns the existing record. Relationship writes (achievement plus skill links) happen in one transaction and roll back together. Concurrent browser tabs detect stale saves through the record's `updated_at` sent back as a hidden field; a mismatch refuses the write and asks the user to reload. Database unavailability currently surfaces as a server error; a friendlier retry message is a known gap.

## Phase 1 generation

Save original pasted posting and application → collect career facts → freeze the selected inputs → generate structured drafts → validate shape and evidence references → save each completed document revision → review/edit → render requested PDFs → explicitly mark application submitted with exact material references.

Pasted text can be used directly before full job extraction/matching exists. A minimal Job record belongs in Phase 1; URL import and scoring do not. Do not hold an SQL transaction open across model calls or PDF rendering. Persist outcomes between expensive operations. If one artifact fails, show which artifact failed and retain completed siblings.

Run states: queued, running, succeeded, partially_succeeded, failed, cancelled. Start with the simplest execution model that survives the actual runtime behavior. Before Phase 1 implementation, decide between a bounded application-owned runner with interrupted-run detection and a PostgreSQL-backed worker. Next.js request lifetime or an unawaited promise is not a durability guarantee. Phase 0 needs neither runner.

On restart, unfinished work is visibly interrupted/recoverable, never reported as successful. Retry bounded transient failures; validation failures require correction rather than unlimited retries. An exact replay must not duplicate artifacts. Persist PDF metadata only after an atomic file write; reconcile orphaned files and pending artifact rows after crashes.

## Separate lifecycles

Applications: proposed statuses `preparing`, `ready`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`, `accepted`. Ready means user-reviewed materials; a successful model call alone does not make it ready. Users may import an already-applied pursuit without generating materials. Define normal transitions plus an explicit correction action rather than preventing legitimate data entry. Detailed interview rounds wait until Phase 4.

Job availability: active / expired / unknown. Generation run state is independent. A job expiring must not move an application out of interviewing. Later matching/research records do not overwrite pursuit status.

## Minimum checks

Phase 0 (implemented in `tests/`): save/reload across restart; input and FK constraints; transactional failure; stale update behavior; restricted deletes; private data separation through the isolated `landed_test` database; backup/restore scripts. Clean install is verified by CI on a fresh runner.

Phase 1: factual-claim support, unknown evidence IDs, unsupported metrics, preserved document inputs after profile edits, partial provider failures, retries, and extractable/readable PDF output. Fixed synthetic cases exercise behavior without paid model calls; a small optional real-model evaluation set tracks quality. Record prompt/model identity and available usage without assuming every runtime reports cost/tokens.

Logs identify operation/run and error category without copying career content or secrets by default. Add diagnostic detail as needed; no external observability account is a quickstart prerequisite.
