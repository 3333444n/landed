# ADR 010 — Personal writing context, Companies and Job Sources

Date: 2026-09-23. Status: accepted scope; locally implemented, pending user acceptance and merge.

## Context

Career evidence and the posting do not capture why the user wants a particular role or what makes a company interesting. Shared employer research is useful across several jobs. Discovery sources vary by country and user, and should not be confused with ingestion methods.

## Decision

Rename the broad About me section to Profile and its current Profile block to General info, retaining URLs. Store one optional About me narrative on the profile and one optional Interest narrative on the application, with partial version-checked saves. These describe voice, values and motivation; they cannot establish new accomplishments or numeric results.

Add a Companies module with Name, Location, Website, About and a Findings table. Findings carry text, source URL, retrieval date and statement/interpretation kind. Jobs optionally link to a company while preserving their original posting company name. Existing jobs are not automatically linked. Jobs owns selection of up to five findings, enforced against the same owner and company. Company changes clear selections; finding deletion clears live selections; referenced companies cannot be deleted.

Keep profile-owned Job Sources in the Jobs module, starting empty. Settings supports create, rename, archive and restore. Job forms show an optional Source selector with inline creation. Archived choices remain on existing jobs. Store job_source_id separately from source (`pasted`) and source_url.

Extend browser and MCP surfaces consistently, with retry IDs for creates and versions for changes. The harness performs any requested research through its own tools; Landed does not fetch company pages. People remains deferred.

New cover-letter runs freeze personal narratives, all company fields and selected findings alongside career facts and the posting. Paragraph contextIds are distinct from career evidenceIds; historical snapshots omit the new optional context and remain readable. Numbers supported only by company/posting context produce a context_number warning for attribution review. Narratives never supply numeric proof of accomplishments. Prompt version 3 targets three or four body sentences with one concrete story; the single-column PDF may leave whitespace.

## Consequences and validation

The company link and sourced findings support reuse without changing original posting data. Free narrative entry is easy to use but still requires selection and human review; prompts and ID checks cannot establish semantic truth. Existing resumes and recruiter messages retain their snapshot behavior. No private sourcebook is imported automatically.

Use additive generated migrations. Test ownership, retries, stale writes, clear/archive behavior, company dependency checks, finding selection and deletion, immutable snapshots, browser/MCP parity, and legacy documents. Required integrated validation is pnpm verify:full plus the real-provider pnpm eval for changed generation contracts/prompts. Record actual results in doc 09 after running them. Keep local worktrees and commits for user testing; no PR before review.


## Superseding decision — canonical company identity and shared logo

Accepted follow-up after local review, 2026-09-23. This replaces the decision above to retain an independent posting-company name and job logo. A Company now owns the canonical name and shared logo. A job has one optional Company selector, and no separate editable company text or logo. Resolve linked identity consistently in job lists/details, MCP reads, new snapshots and PDF filenames. Keep form order Title, Company, Availability, Source, Location, Salary, Posting URL, Description.

Company forms own image uploads, HTTPS logo addresses and removal. The same guarded fetch and inert image serving rules apply. MCP company create/update accepts logo_url (omit preserves, null clears); add_job uses optional company_id and removes free-text company/job logo_url. New jobs may remain unlinked. Clearing/changing company still clears findings; company deletion is blocked while linked.

The migration preserves all existing links. Each previously unlinked legacy job receives its own company record, with no automatic name matching. Companies without a logo inherit the newest available linked-job logo; existing company logos are preserved. It reuses stored artifacts and does not unlink legacy files. It never edits frozen snapshots or saved revisions. Add follow-up checks for canonical identity propagation, shared logo replace/clear, migration preservation, new unlinked jobs and the revised MCP inputs; prior validation does not establish this follow-up's correctness.


New logo writes use `<profile_id>/logos/<company_id>-<randomUUID>-<8-character checksum>.<ext>` and `/companies/<id>/logo` serving. The per-write UUID prevents an older cleanup from deleting newly restored identical bytes. Legacy filenames remain readable, with no migration cleanup. The revised add_job rejects the former company argument with guidance to create/resolve a Company and send company_id, preventing silent loss of employer identity.
