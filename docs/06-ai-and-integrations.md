# 06 — AI, harnesses, and retrieval

Status: future design; no AI dependency in Phase 0. Updated 2026-09-13.

## Distinguish the moving parts

- A model provider performs inference, locally or remotely.
- An SDK is the client library that calls it.
- A workflow follows an application-defined sequence of steps.
- An agent chooses actions/tools within an explicitly bounded task.
- A harness supplies execution facilities such as tools, context handling, permissions, and sessions.
- RAG retrieves relevant external-to-the-model information and includes it in generation input. It does not require an agent or vector search.
- LangChain supplies model/tool/agent abstractions. LangGraph supplies stateful orchestration capabilities. They are not synonyms and need not both be dependencies.

## First generation implementation

Use plain TypeScript functions, schema validation, explicit prompts, and one supported model adapter. Separate evidence selection, generation, validation, persistence, and PDF rendering. Begin with deterministic selection or a bounded evidence-selection call when all facts cannot reasonably be supplied. Grounding does not require embeddings.

When agentic research arrives, a small bounded tool loop is a useful baseline: give allowed tools and current state to a model, validate its tool request, execute the approved operation, record the observation, repeat until complete or the step/time budget is exhausted. Avoid rebuilding a general orchestration framework. Reconsider LangGraph when checkpointing, branching, resumable human approval, recovery, or state persistence becomes costly to maintain. The user's preference for LangGraph/LangChain is recorded as a future direction, not permission to add both to Phase 0.

## Existing harness integration

Claude Code supports programmatic invocation and structured output. A harness adapter is plausible for people already using it. It is not automatically the easiest default for new users: installing/authenticating a CLI, runtime permissions, supported billing/auth paths, subprocess lifecycle, and host/container connectivity all need a supported recipe.

Recommended choices for Phase 1 evaluation:
1. App calls one model provider directly: simplest app-owned generation path; users supply supported credentials.
2. Optional host-side harness bridge: reuses an installed runtime through documented mechanisms; explicit connection setup and permission boundaries.
3. Optional local-model endpoint: local inference but model downloads, memory/hardware needs, and quality expectations add setup cost.

Choose one verified initial path. Do not advertise all three as supported until tested. Do not read/copy a user's CLI credential store into containers or assume a chat subscription grants an interchangeable API credential. User-facing setup should explain which component receives their facts.

Future MCP is another adapter to application operations, not direct SQL access. A CLI controlling the app via MCP and an app invoking a CLI harness are opposite integration directions; choose deliberately. Authentication and transport capability must be checked for the actual client before promising remote ChatGPT/Claude control.

## Input and tool boundaries

Job postings/web pages are data, not instructions. Keep them separate from trusted instructions. Use bounded tools for fetch/search and application operations, not unrestricted shell/database access. Preserve sources and retrieval dates; do not invent inaccessible company/recruiter information. External URL fetching must reject private-network targets, validate redirect destinations, and impose size/time limits when Phase 2 enables it.

Generated claims cite input snapshot entries, but valid IDs alone do not establish factual support. Compare claims with facts, evaluate unsupported additions, and require user review before submission. Automatic Phase 3 generation produces unreviewed drafts only.

## Sources

- [Claude Code programmatic use](https://code.claude.com/docs/en/headless)
- [LangGraph JavaScript overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [pgvector](https://github.com/pgvector/pgvector)
