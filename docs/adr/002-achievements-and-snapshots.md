# ADR 002 — Simple achievements and generation snapshots

Date: 2026-09-13. Status: no achievement versioning accepted; snapshot/document details proposed.

## Context

Users need easy editing of their career facts. Maintaining revision history for each achievement adds complexity. Old application materials should still retain the inputs that supported them.

## Decision

Edit achievements in place. Do not create AchievementRevision records or a history UI. Proposed Phase 1 compromise: capture the selected facts and job description once per generation run and retain saved document revisions, especially submitted versions.

## Alternatives

Version every profile record: richer historical navigation, more joins and lifecycle rules. Keep only live references: simpler storage, but changing a fact changes the apparent support for an old document. Save only PDFs: loses structured editing and input traceability.

## Consequences and reconsideration

Snapshots duplicate a bounded amount of data and must be included in export/purge behavior. They are not an automatic claim-verification mechanism. Reconsider achievement history only if users actually need audit/undo features beyond current editing.
