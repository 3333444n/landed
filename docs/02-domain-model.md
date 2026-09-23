# 02 — Domain model

Status: vocabulary through the assistant surface (ADR 008) in use; Phase 2 to 4 concepts proposed; simple editable achievements accepted. Updated 2026-09-16.

A domain model describes the meaningful things, relationships, and rules of the problem being solved. It does not prescribe tables or frameworks. For a library: a Book describes a work, a Copy is an individual item, and a Loan records a borrower taking that copy. Separating Book from Copy matters before deciding how either is stored.

In this application, a Job is an external opening; an Application is a person's pursuit of it. An expired posting can still have an application in interviewing status. A generated document is neither a career fact nor a submission.

## Vocabulary

| Concept | Meaning and rule |
|---|---|
| Profile | One person's identity, preferences, and career information; one active profile per installation initially |
| Employment | A role at an employer during a period, with an optional location (city and country, or Remote); concurrent roles and incomplete dates are allowed |
| Project | A distinct body of work; may optionally belong to an employment record |
| Education | A program/qualification at an institution; not necessarily completed |
| Skill | A named capability recorded by the person; not proof of a specific accomplishment |
| Achievement | A factual statement, optionally elaborated as problem/action/result/metric, with an optional source note |
| Evidence | The facts supplied to support generated claims; includes more than achievements, such as education and employment |
| Job | Original posting plus source and normalized attributes, a salary as free text and an optional link to its canonical Company; its contents are untrusted input, and an uploaded image is typed from its bytes |
| Application | A tracked pursuit, including preparation before submission; one per profile/job initially |
| Document | A resume, cover letter, or recruiter message belonging to an application |
| Document revision | Saved generated, pasted or explicitly saved edited content; immutable, so previous generated/submitted material stays intact |
| PDF artifact | A rendered file derived from a particular document revision and template |
| Generation run | One attempt to produce one document, through the configured provider, paste-back or the user's own assistant; records its input snapshot, prompt version, model, usage and outcome |
| Input snapshot | The frozen copy of the career records and posting a generation run used; its record ids are the original ids, so an old document keeps its context after the live records change |
| Grounding warning | A deterministic finding on a document revision that a cited evidence id is not in the snapshot, a unit cites nothing, or a number is absent from the cited evidence; shown to the user, never a claim of factual support |
| Match assessment | An explained judgment about eligibility, strengths, gaps, and fit; separate from application status |
| Research finding | A source-backed fact or uncertain claim about company/product/people, with retrieval time |
| Run | A record of generation, research, or ingestion work and its outcome; separate from product lifecycles. Generation runs exist; research and ingestion runs are later phases |
| Interview | A scheduled/recorded conversation or assessment linked to an application, introduced fully in Phase 4 |

## Evidence rules

An achievement may be standalone, associated with one employment record, or associated with one project. At most one direct employment/project link is allowed. A project can itself link to employment. This avoids conflicting context links while retaining both contexts indirectly.

A factual statement is required; a numerical metric is not. Sources may be a user assertion or an external reference. A user assertion is not independently verified evidence. The system must not require fictitious numbers to complete a form. A skill may link to multiple achievements and vice versa.

Achievements are edited in place; no achievement revision/history feature. Phase 1b saves the exact selected facts and original job text as a generation-input snapshot. This preserves the context for an old document without recreating historical versions of every profile record. Snapshot identifiers and source record IDs are provenance aids, not proof that a generated claim is entailed.

## Boundary terminology

A module is a code boundary around related responsibilities. A bounded context is a boundary within which a domain model and vocabulary have consistent meaning. A module does not automatically qualify as a bounded context. These boundaries are working hypotheses; avoid declaring that a capability could never become a domain or service.

An aggregate groups data/rules that must remain consistent during an operation. We do not need to load a person's entire history for each update: save an achievement and its skill links atomically, validating that linked records belong to that profile.


## Writing and company context (2026-09-23, local feature branch)

The **Profile** navigation hub contains **General info** (identity, contact, summary and preferences), career evidence sections and **About me** (the user's optional story, values and motivation). **Interest** belongs to an application: the user's reason for pursuing its role and company. Neither narrative is a substitute for evidence of an accomplishment.

A **Company** is shared context for zero or more jobs, with Name, Location, Website and About. A job optionally links to its canonical company, which supplies its name and shared logo throughout the app. There is no separate editable posting-company name. Migration preserves existing links and creates one company per unlinked legacy job without matching names. A **Finding** is a dated, sourced statement or interpretation associated with one company. An application can use up to five company findings selected on its job; selection does not imply verification. People and built-in web research remain deferred.

**Source** on a job identifies where the user found it. **Job Sources** in Settings is the user-managed vocabulary, empty by default; archived sources retain historical assignments. This is separate from the posting URL and the technical ingestion method (`pasted`). See ADR 011 for the accepted boundaries. Implementation is local and locally accepted, pending merge.
