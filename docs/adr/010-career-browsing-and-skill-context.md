# ADR 010 — Expandable career browsing and explicit skill context

Date: 2026-09-19. Status: accepted design; local implementation pending user acceptance and merge.

## Context

Career facts currently require opening an edit column to inspect details. Skills connect to achievements, but users also need to record where a skill was used without writing an achievement first. Filtering should include existing evidence while keeping explicit user associations distinguishable.

## Decision

About me and its dedicated lists share expandable read-only record cards. A separate pencil action opens the existing edit URL. Native disclosure state is ephemeral presentation state, while routes still select columns and URL parameters store filters. Multiple disclosures may remain open. Nested records use the raised surface without a second glass layer; no forms are embedded in cards. This revises the original card interaction of ADR 005 without replacing its navigation model.

Skills own two direct many-to-many relationships, to roles and to projects, persisted in owner-aware link tables. Users edit those lists on the skill form or through the existing profile tools. Reads return a coherent skill version and link lists; saves are transactional and version checked. Deleting a role/project with direct skill links is refused until the user detaches those links. Deleting a skill removes its links.

For browsing, effective context is the union of direct links, achievement context, and parent roles of associated projects. This union is derived, never stored as direct associations. A role association does not imply use on every project under that role. Multiple Role and Project chips combine with OR within each group and AND across groups, with explicit All and No-context choices. Removing a direct link does not remove an independently evidenced connection.

The document snapshot projection and grounding rules remain unchanged. New associations organize career facts; they do not by themselves justify new generated accomplishments. Historical snapshots stay frozen.

## Alternatives

Only deriving skills through achievements avoids a migration but requires writing an accomplishment to record simple experience. Automatically storing derived associations loses their provenance and makes detaching/reassigning evidence ambiguous. Replacing lists with a single nested editor removes useful deep links and makes large lists difficult to manage.

## Consequences

Two join tables and additional profile contracts are required. Existing records need no backfill. Cards distinguish editable links from derived associations, and filters follow project reassignment immediately. Section management pages remain available for long lists. Disclosure state resets on reload; filter state survives reload and is retained by the edit link.
