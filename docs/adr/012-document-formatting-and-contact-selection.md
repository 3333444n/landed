# ADR 012 — Document formatting and resume contact selection

Status: Accepted, implemented and verified (2026-09-26), merged in PRs #54–56.

## Context

Document fields were plain text and the resume prompt chose a fixed contact row that excluded websites. Users need visual emphasis and explicit control over which saved contact facts appear, with the same behavior in the browser and assistant tools.

## Decision

Keep evidence-bearing text and add optional formatting entries with editable field paths and ordered text segments. Supported marks are bold, italic and underline; segment text must exactly equal the field text. Template styling remains the base. Tiptap provides field-scoped visual editing, selection-only formatting controls, keyboard shortcuts and undo. The resume contact row shares hover/click editing with other fields; contact destinations are navigable only inside its open editor. No HTML is persisted. Resume and cover-letter generation may add restrained emphasis; regeneration does not transfer old marks. Recruiter messages remain plain text.

Store ordered resume contact identifiers in Profile preferences JSON and freeze the selected order into generation snapshots. New resumes use the profile preference; regeneration preserves the existing resume selection. The application assembles the contact row from frozen profile facts. Per-resume edits select and reorder only; they do not change profile facts. Legacy contact strings retain their wording and order; only unambiguous matches to frozen values receive link destinations.

Actual document links are blue and underlined, an explicit exception to monochrome output. Phone destinations retain WhatsApp behavior. Formatting and contact saves create unapproved immutable revisions and retain existing validation and stale-write checks. Mixed-font widths participate in wrapping warnings; no content is silently dropped or shrunk.

## Consequences

Existing JSON remains readable without a SQL migration or historical rewrite. Browser, PDF and MCP use the same formatting and contact contracts. Formatting introduces an editor dependency and expands render/extraction tests. Provider schemas and prompts require evaluation. PDF text extraction verifies wording and order, not certification for every external parser. Defaults do not silently update existing revisions. Apply profile default is an explicit pending edit. Template 9 refreshes cached PDFs; MCP adds `set_resume_contacts`, bringing the endpoint to 43 tools. See [validation and the provider evaluation](../09-decisions-and-readiness.md#document-formatting-and-resume-contacts-2026-09-26-implemented-merged-in-prs-5456).
