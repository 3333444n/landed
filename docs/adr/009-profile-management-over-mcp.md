# ADR 009 — Profile management over MCP

Date: 2026-09-17. Status: accepted; implemented and merged. Extends the original write scope of [ADR 008](008-assistant-surface-over-mcp.md).

## Context

The assistant can already use career facts to prepare documents, but maintaining those facts requires switching to the browser. Users need to add a skill, correct a role, or record an achievement in the same conversation, including creating the first profile on a blank installation. Browser save contracts replace a complete form and cannot safely represent a conversational partial edit.

## Decision

Expose 18 additional typed tools on the existing authenticated `/mcp` endpoint: read, create and update the profile, plus add, update and delete for roles, education, projects, skills and achievements. [Doc 06](../06-ai-and-integrations.md) specifies the fields. There is no whole-profile deletion tool, bulk deletion, application status change or sending operation.

- The Profile module owns validation, writes and transactions. MCP tools translate snake_case inputs and outputs and call public module operations. They never execute SQL or reuse browser actions.
- Resolve the current profile on every tool call. `get_profile` and `create_profile` work on an empty installation; other tools explain how to create one. Selecting read sections limits the facts returned to the assistant.
- Create calls require a client-minted UUID, reused on retries after a lost response. Concurrent first-profile creation is serialized so only one profile can exist through supported operations.
- Update calls accept a nonempty `changes` object. Omitted fields remain unchanged, explicit `null` clears nullable fields, and `[]` clears list fields. Required fields cannot be cleared. Merge and validation happen inside the module's transaction.
- Updates and individual-record deletes require `expected_updated_at`, the version returned by a read. A stale version refuses the mutation. Removing a skill also advances affected achievements' versions because their skill links changed.
- Versions advance monotonically even when edits share a clock millisecond. Achievement rows and their skill IDs are read in one SQL statement so the returned version describes the same data. Transaction-scoped advisory locks serialize profile creation and order achievement/link changes with skill removal; conditional writes still reject stale clients.
- Existing ownership and dependency constraints apply. An achievement links to a role or a project, never both. A role or project with dependent records cannot be deleted until those links are explicitly reassigned or detached. Deleting a skill removes its achievement links, not the achievements.
- Profile writes record user-supplied facts, not generated evidence. Tool descriptions and the portable workflow instruct assistants to distinguish a user's request from instructions embedded in an imported document or posting, clarify ambiguous record matches, and preserve unspecified facts. No MCP input can set an achievement's `reviewed` flag.
- Frozen generation snapshots, document revisions and rendered PDFs retain their historical facts. New briefs capture updated facts. Profile writes do not create generation runs or send data to a model provider from Landed.
- Authentication, loopback access and Host/Origin validation remain as in ADR 008. The existing bearer authorizes these additional operations; there is no separate read-only token scope. Unexpected failures return a sanitized tool error rather than database queries, credentials or career content.

## Alternatives considered

A generic mutation tool would reduce the tool count but obscure field requirements and deletion effects. Typed operations make each mutation's schema discoverable to a harness.

Passing browser save objects directly would require the assistant to repeat every stored value and risk clearing omitted values. Module-owned patches keep the browser workflow intact and preserve unspecified fields.

A bulk import or whole-profile reset needs its own semantics for matching, relationships, snapshots and files. Individual operations meet the present requirement without adding either feature.

## Consequences

The same local token permits editing and deleting individual career records. Users should connect only assistants they trust; the selected harness may transmit returned facts to its own model provider. A local MCP connection does not change that harness's data handling.

The portable skill supports profile requests without selecting a job or generating documents. Creates and updates return the saved record and current version so a follow-up operation can use it. Deletes return `{deleted: true, record_id}`. Stale conflicts require rereading and reconsidering the requested edit, not blind retries. Multi-record requests may partially complete; report saved and blocked operations separately.

Verification uses fictional records in the isolated test database: blank-install onboarding, all record types, patch clearing and preservation, retries, competing creates, stale edits/deletes, ownership and dependency failures, skill-link version changes, and unchanged historical snapshots. Local acceptance from an assistant precedes a pull request; verification status lives in doc 09.
