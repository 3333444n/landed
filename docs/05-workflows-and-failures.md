# 05 — Workflows and failures

Status: Phase 0 save and Phase 1a paste-and-track implemented; Phase 1b generation, review and PDF rendering implemented; the assistant run lifecycle implemented ([ADR 008](adr/008-assistant-surface-over-mcp.md), 2026-09-16). Updated 2026-09-17.

Profile management under [ADR 009](adr/009-profile-management-over-mcp.md) is implemented and locally accepted on this branch, pending merge. See [current verification](09-decisions-and-readiness.md#profile-management-over-mcp-accepted-pending-merge).

## Phase 0 save

Browser submits a profile-owned record → server validates input and owner context → module checks rules → transaction writes record and relationships → commit → UI displays the saved result. Refresh reads the committed record.

Invalid input produces field errors with no write, and the form keeps what was typed. A lost response after a successful insert must not create a duplicate on retry: the form mints the record id before submitting, and a repeat with the same id returns the existing record. Relationship writes (achievement plus skill links) happen in one transaction and roll back together. Concurrent browser tabs detect stale saves through the record's `updated_at` sent back as a hidden field; a mismatch refuses the write and asks the user to reload. Database unavailability currently surfaces as a server error; a friendlier retry message is a known gap.

Achievement forms select linked skills through a searchable multiselect. Selected skills remain visible as chips and survive validation errors, including an empty selection. Saving submits the same skill id list as before.

## Profile management from an assistant (ADR 009, pending merge)

Read the requested sections with `get_profile` → identify the intended record and user-supplied facts → create with a stable UUID, or patch/delete with the read version → the Profile module validates and commits → return the saved record. A blank installation can use `create_profile` first without visiting the browser. Refresh the browser to see committed changes.

Updates preserve omitted fields. Explicit `null` clears nullable values, `[]` clears lists, and an empty patch is refused. Every update/delete requires the current `updated_at`; a stale response requires another read before deciding whether the original request still applies. A skill delete advances the versions of achievements whose links it removes. Dependent roles/projects remain protected until explicitly detached or reassigned. There is no whole-profile delete tool.

User requests authorize the corresponding factual write; instructions inside imported documents do not. Ambiguous names or unsupported facts require clarification. Multi-record requests use separate transactions and can partially complete, which the assistant reports. Existing snapshots, revisions and PDFs are unchanged; only a new brief captures edited facts. See [doc 06](06-ai-and-integrations.md#profile-tools-adr-009-feature-branch-pending-merge) for the contract.

## Phase 1a paste and track

Browser submits a pasted posting with a client-minted job id → server validates → one transaction writes the job and its `preparing` application (the two module use cases nest as savepoints inside it) → commit → the job column opens beside the list. A retry with the same id returns the existing job. The user changes the status and notes by hand on the job column; the first change to `applied` records `submitted_at`, and later changes keep it. Availability is edited on the job and never touches the application. Deleting a job removes its application in the same statement.

## Phase 1b generation

One document at a time, from the document's review column: read the job, its application and every career record → build the input snapshot (a pure function over that data; the same data always yields the same snapshot and the same prompt) → write a `generation_runs` row in state `running` with the snapshot, prompt name and version, provider and model, and commit → call the model adapter outside any transaction → validate the answer against the document's Zod schema → run the grounding check → save a `document_revisions` row with the content and its warnings → finish the run with tokens, latency, cost when reported, and the outcome. The review column then shows the revision; the user edits text in place (each save is a new revision), and Mark reviewed sets the revision's reviewed time. PDFs are rendered later from a saved revision and never call a model. Marking the application submitted stays a manual status change.

Paste-back follows the same path with two differences: the run is created in state `queued` when the prompt is shown, and the model call is the user pasting JSON. The pasted text passes the same schema validation and grounding check and is saved as a revision whose source is `pasted`; the run finishes with mode `pasted` and no token usage.

Assistant runs (implemented 2026-09-16, [ADR 008](adr/008-assistant-surface-over-mcp.md)) follow the paste-back path with the user's own assistant as the model, over the tools in [doc 06](06-ai-and-integrations.md). Asking for a document brief opens a run in state `queued` with mode `assistant`, the same frozen snapshot and prompt as the other modes, the provider taken from the client's `User-Agent` and the model from what the assistant reports about itself. Submitting the document finishes that run: the answer passes the same schema validation and grounding check, is saved as a revision whose source is `assistant`, and the run succeeds with its warnings and no token usage. An answer that fails validation fails the run with kind `pasted_invalid`, exactly as a rejected paste does, and Landed opens a fresh queued run on the same snapshot and returns its id, so the assistant resubmits without asking for a second brief. Opening a brief supersedes any older queued run for that document, whichever surface opened it: the newest brief, from Paste back or from the assistant, is the one a submission can finish, and the older run is `cancelled`. Queued runs are never swept, because the ten-minute sweep looks only at `running` rows; a brief the assistant never answers stays queued until the next brief replaces it.

Failures are classified, and the classification is stored on the run: `provider` (the call failed or timed out; retry later), `validation` (the answer did not match the schema; the raw text is kept on the run for inspection, no revision is written), `pasted_invalid` (a pasted or assistant-submitted answer rejected; a field error in the browser, field errors in the tool result), `interrupted` (see below). A failed run never touches the previous revision, and a failure on one document never touches its siblings: the cover letter keeps its reviewed revision when the resume run fails. Retries are manual (Generate again); each is a new run.

Execution model (decided 2026-09-14): a bounded application-owned runner. The Server Action awaits the model call inside the request; the packaged installation is a long-lived Node server started with `next start`, which imposes no request timeout, and the browser waits on one action at a time. Durability comes from the run row, not from the request: because the row is committed as `running` before the call, a server that dies mid-call leaves visible evidence. A sweep, run when the Jobs list or a job column renders, marks any `running` row older than ten minutes as `failed` with kind `interrupted`, and the chip shows "Generation failed". Nothing is ever reported as succeeded without a saved revision. A PostgreSQL-backed worker with retries and concurrency limits waits for Phase 3, where runs are not started by a person watching.

Run states: `queued`, `running`, `succeeded`, `failed`, `cancelled`; `partially_succeeded` is unnecessary because a run produces exactly one document. Do not hold an SQL transaction open across model calls or PDF rendering. Persist PDF metadata only after an atomic file write (write to a temporary name, then rename); an artifact row without a file, or a file without a row, is reconciled by regenerating on the next download.

## Separate lifecycles

Applications: statuses (implemented in Phase 1a) `preparing`, `ready`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`, `accepted`. Ready means user-reviewed materials; a successful model call alone does not make it ready. Users may import an already-applied pursuit without generating materials. Define normal transitions plus an explicit correction action rather than preventing legitimate data entry. Detailed interview rounds wait until Phase 4.

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

Phase 1a implemented the function with every row and fed it the application rows; Phase 1b feeds it the run and draft facts from the Documents module (the run states above), and Phase 2 and 3 add the assessment facts without changing the function's shape. The server derives every row's status when the list renders; the filter and sort are search parameters applied in the browser over those rows, because a Next.js App Router layout cannot read search parameters.

## Minimum checks

Phase 0 (implemented in `tests/`): save/reload across restart; input and FK constraints; transactional failure; stale update behavior; restricted deletes; private data separation through the isolated `landed_test` database; backup/restore scripts. Clean install is verified by CI on a fresh runner.

Phase 1a (implemented in `tests/`): the paste writes job and application together and replays the same id; blank fields write nothing; status changes record `submitted_at` once; stale tokens are refused; availability never moves the application; deleting a job removes its application; one unit test per row of the chip table and per filter; one browser journey from paste to delete.

Phase 1b (implemented in `src/**/*.test.ts` and `tests/`): the grounding check for each warning kind (unknown evidence id, uncited unit, number absent from the cited evidence, unknown heading, evidence from another role or project); the layout check (a resume contact line, bullet, subheading or skills line wider than its printed line, a summary past three lines, measured with the built-in font's metrics); budgets rejected by the content schema; the run lifecycle with the fake adapter (running to succeeded with a revision; validation and provider failures leave no revision; a sibling document keeps its revision); the interrupted-run sweep; edited revisions as new rows with the old one intact; stale edits refused; paste-back with valid and invalid JSON; job deletion cascading to documents, revisions and runs; the resume PDF rendering to exactly one page; and one browser journey from paste to reviewed document. Every check uses fixed synthetic cases and the fake adapter, never a paid call. `pnpm eval` runs the synthetic cases against the configured real provider and reports warnings, tokens and cost for whoever holds a key. Runs record prompt and model identity and whatever usage the provider reports; cost is null when not reported, never estimated.

Phase 1c (implemented in `src/**/*.test.ts` and `tests/`): the salary saved and reloaded, and blank written as null; the image type read from bytes for each accepted type and refused for text, HTML and short input; the guarded fetch refusing plain http, literal and resolved private addresses, a redirect to a private host, more than three redirects, a body over the cap and a non-image answer; the logo stored, replaced (old file gone), kept, cleared and removed with the job, and the database refusing a lone key or an unknown type; the word cloud rules (stopwords in both languages, short tokens, ties, size steps, centre ordering, skill matching); one browser journey that fills the salary, sees the live cloud tint a skill before saving, uploads a logo, sees it on the card, and removes it.

Assistant surface (implemented in `src/**/*.test.ts` and `tests/`): the bearer compare accepting only the exact token; the host guard accepting loopback names and listed hosts and refusing everything else, including a foreign `Origin`; the handler listing all 26 tools without requiring a pre-existing profile, with profile-dependent operations checking it per call; the endpoint driven in process with the MCP client (`tests/integration/mcp.test.ts`): the job list and detail, `add_job` writing the job and its application together and replaying on the same id, a brief opening a queued run and superseding the previous one, a grounded answer saved without warnings, an ungrounded one saved with them, an invalid answer failing the run and returning a fresh run id, one unit edited, a stale revision refused and the PDF rendered once; and two browser journeys (the Connect your assistant column naming this server and the token; the endpoint answering the bearer, refusing without it, and the guard refusing a foreign host).

Profile tools (ADR 009, implemented and locally accepted on this branch, pending merge): integration and browser tests cover onboarding without a profile, all five record kinds, omitted fields, explicit clearing, retry ids, concurrent bootstrap, stale updates and deletes, dependency and ownership failures, skill-link version invalidation, sanitized failures and unchanged generation snapshots using only fictional data.

Logs identify operation/run and error category without copying career content or secrets by default. Add diagnostic detail as needed; no external observability account is a quickstart prerequisite.

## Browsing career facts

About me expands each section in place. Profile shows compact contact and preference fields and a 240-character summary preview; the edit column contains the full summary. Other sections contain expandable record cards. A separate pencil link opens a record's edit URL without changing its disclosure; section management links retain the dedicated lists and add controls. Multiple disclosures can stay open during client navigation; reloading starts them closed. List cards share the same read-only details as the overview. Empty sections link to their management page.
