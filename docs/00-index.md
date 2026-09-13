# 00 — Documentation index

Status: design baseline, not an implemented application. Updated 2026-09-13.

Numbers establish reading order, not software release versions. Accepted choices are distinguished from proposals; a diagram describes the design, not running code.

| Document | Question answered | Status |
|---|---|---|
| [01 — Product and phases](01-product-and-phases.md) | What can users accomplish, and when? | User scope recorded; submilestones proposed |
| [02 — Domain model](02-domain-model.md) | What do the product's concepts mean? | Proposed vocabulary and rules |
| [03 — System and modules](03-system-and-modules.md) | Where does code run, and who owns behavior? | Stack accepted; packaging/boundaries proposed |
| [04 — Data model](04-data-model.md) | How will PostgreSQL represent those concepts? | Logical design; no migrations yet |
| [05 — Workflows and failures](05-workflows-and-failures.md) | What happens on success, failure, and retry? | Phase 0/1 design |
| [06 — AI and integrations](06-ai-and-integrations.md) | How do models, harnesses, RAG, and agents fit? | Future integration policy proposed |
| [07 — Quickstart contract](07-quickstart-contract.md) | What must an inexperienced user be able to install? | Acceptance contract; not runnable instructions |
| [08 — Contributions and documentation](08-contributions-and-documentation.md) | How do changes stay understandable and documented? | Proposed contributor baseline |
| [09 — Decisions and readiness](09-decisions-and-readiness.md) | What is accepted, open, or deferred? | Current decision register |

## Architecture diagrams

Diagrams are Mermaid blocks inside the numbered documents, so they render on GitHub and change in the same commit as the text they describe.

- Local runtime and module boundaries: [03 — System and modules](03-system-and-modules.md).
- Core evidence relationships: [04 — Data model](04-data-model.md).

## Maintaining this baseline

Change the relevant numbered document and its Mermaid diagram in the same change as the behavior/schema/dependency change. Record significant accepted decisions in an ADR. Keep one authoritative explanation per subject and link to it. No recurring background monitor is required.

Personal inputs and development notes must not be included in release artifacts.
