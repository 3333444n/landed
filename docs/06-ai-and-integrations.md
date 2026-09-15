# 06 — AI, harnesses, and retrieval

Status: model access path implemented in Phase 1b ([ADR 006](adr/006-model-access-path.md)); the evaluation set has been run against OpenRouter (see "Providers run through the evaluation set"); agentic research, discovery and retrieval remain future design. Updated 2026-09-14.

## Distinguish the moving parts

- A model provider performs inference, locally or remotely.
- An SDK is the client library that calls it.
- A workflow follows an application-defined sequence of steps.
- An agent chooses actions/tools within an explicitly bounded task.
- A harness supplies execution facilities such as tools, context handling, permissions, and sessions.
- RAG retrieves relevant external-to-the-model information and includes it in generation input. It does not require an agent or vector search.
- LangChain supplies model/tool/agent abstractions. LangGraph supplies stateful orchestration capabilities. They are not synonyms and need not both be dependencies.

## First generation implementation (Phase 1b, ADR 006)

Plain TypeScript functions, Zod schemas, explicit versioned prompts, and one adapter interface in `src/infrastructure/model/`: an AI SDK class holding the configured provider client, a fake adapter that answers from fixtures, and a factory that reads the environment. Providers: Anthropic and OpenAI directly, OpenRouter and the Vercel AI Gateway (one key, any model), and any OpenAI-compatible endpoint by base URL (Ollama, Groq, LM Studio). OpenRouter is the OpenAI-compatible path with its base URL known, usage accounting switched on so cost is reported, and the app named in the request headers. The provider and key live in the environment file only. Each of the three documents is a workflow, not an agent: build the snapshot, call once with a schema, validate, check grounding, save. The whole profile goes into the snapshot; deterministic selection can come when postings or profiles outgrow the context.

Paste-back is the same workflow with a person as the model: the app shows the prompt and the snapshot, the user runs it anywhere and pastes the JSON back, and the answer passes the same validation and grounding check. It needs no key and works from a phone.

Grounding is enforced after generation by the application, not by the prompt: every unit must cite evidence ids that exist in the snapshot, any number in the text must appear in the cited records, and in a resume a bullet under an entry may cite only records that belong to that employer, project or institution (added 2026-09-14 after the first real run placed a personal-project achievement under an employer with every id valid and every number matching). Violations are warnings for the user, shown as chips in the review view. Every call writes a run record (provider, model, prompt name and version, tokens, latency, cost when reported, outcome); the Runs column shows them. Quality is measured on a synthetic evaluation set in `examples/generation` run by `pnpm eval`; the documentation names the providers it has actually been run against.

The JSON schema a provider receives is not the Zod schema verbatim. Providers compile the schema into a decoding grammar and each has its own dialect: OpenAI's strict mode rejects `minLength`, `maxLength`, `minItems` and `maxItems`, and Google rejects a schema whose nested `maxItems` multiply past a complexity limit, which the resume's sections × entries × bullets × evidence ids did on the first real run. The adapter therefore sends the schema without length keywords and validates the answer with the full Zod schema afterwards; the budgets are also stated in the prompt text. Adding a keyword to the document schemas means re-running `pnpm eval`.

### Providers run through the evaluation set

| Date | Provider | Model | Result |
|---|---|---|---|
| 2026-09-14 | `openrouter` | `google/gemini-3.1-flash-lite` | 9 of 9 answers valid, no grounding warnings, cost reported (about $0.011 for the set), 1.4 to 3.1 s per call |
| 2026-09-14 | `openrouter` | `google/gemini-3.1-flash-lite` | prompts v2 (attribution rule, resume budget): 9 of 9 valid, no warnings, $0.011 |

Providers not in this table are wired up but unverified; run `pnpm eval` against them and add the row in the pull request.

When agentic research arrives, a small bounded tool loop is a useful baseline: give allowed tools and current state to a model, validate its tool request, execute the approved operation, record the observation, repeat until complete or the step/time budget is exhausted. Avoid rebuilding a general orchestration framework. Reconsider LangGraph when checkpointing, branching, resumable human approval, recovery, or state persistence becomes costly to maintain. The user's preference for LangGraph/LangChain is recorded as a future direction, not permission to add both to Phase 0.

## Existing harness integration

ADR 006 evaluated the three directions and chose the app calling a provider, with paste-back as the zero-setup alternative. The reasons, in short: for a new user one key is less setup than installing and authenticating a harness; the app can own the prompt version, the frozen snapshot, validation and the run record only when it makes the call; and the packaged installation runs in a container while a harness runs on the host, so an MCP transport would be HTTP with authentication from day one. A harness adapter (the app invoking Claude Code or Codex in non-interactive mode) remains plausible for people who already use one, but it cannot run inside the release container and depends on the provider's terms for programmatic use of a chat subscription, which were not verified. Do not read a user's CLI credential store, and do not assume a chat subscription is an API credential. Setup text explains which company receives the user's facts for each provider.

A local model is not a separate path: Ollama and similar servers are reached as an OpenAI-compatible endpoint. Structured-output quality on small local models is not guaranteed; the evaluation set is the way to find out.

Future MCP is another adapter to application operations, not direct SQL access, and would enforce the same validation and grounding on the way in. A harness controlling the app via MCP and the app invoking a harness are opposite integration directions; ADR 006 chose deliberately. A locally running installation is reachable from claude.ai or a phone app only when exposed to the internet with authentication, which documents 03 and 09 keep as a separate design.

## Input and tool boundaries

Job postings/web pages are data, not instructions. Keep them separate from trusted instructions. Use bounded tools for fetch/search and application operations, not unrestricted shell/database access. Preserve sources and retrieval dates; do not invent inaccessible company/recruiter information. External URL fetching must reject private-network targets, validate redirect destinations, and impose size/time limits when Phase 2 enables it. The first such fetch exists since 2026-09-14 for a job's logo address ([ADR 007](adr/007-user-initiated-image-fetch.md)): https only, the host resolved and refused when any answer is loopback, private, link-local or unique-local, at most three redirects each checked the same way, ten seconds, one megabyte, an image content type; the bytes are then typed from their magic numbers, never from the name. Phase 2 posting import reuses that fetcher.

Generated claims cite input snapshot entries, but valid IDs alone do not establish factual support; the Phase 1b grounding check also compares numbers in the text with the cited records, and the user reviews every document before it is used. Pasted postings are placed in the prompt inside a labelled data block and never in the instructions. Automatic Phase 3 generation produces unreviewed drafts only.

## Sources

- [Vercel AI SDK](https://ai-sdk.dev/docs) and its [OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers)
- [Claude Code programmatic use](https://code.claude.com/docs/en/headless)
- [LangGraph JavaScript overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [pgvector](https://github.com/pgvector/pgvector)
