# ADR 006 — Model access path for generated materials

Date: 2026-09-14. Status: accepted and implemented (Phase 1b, 2026-09-14).

## Context

Phase 1b produces a resume, a cover letter and a recruiter message from the user's career facts and a pasted posting. It is the first model call in Landed, so it fixes who calls whom, where credentials live, and what the app can guarantee about the output. Document 06 names three possible directions: the app calls a model provider; the app exposes its operations to the user's own AI harness (Claude Code, Codex CLI, Claude Desktop) through MCP; or the app invokes a locally installed harness as a subprocess. Two constraints from documents 01 and 07 apply: the packaged installation runs in Docker Compose on the user's computer with no hosted service, and every standard check must run without paid model access.

## Decision

The application calls the model provider directly through the Vercel AI SDK, behind one adapter interface, with the provider chosen by configuration:

- `anthropic` and `openai` through their AI SDK provider packages;
- `gateway`, the Vercel AI Gateway, one key for any model addressed as `creator/model`;
- `openai_compatible`, any endpoint that speaks the OpenAI chat API given a base URL, which covers OpenRouter, Ollama, Groq and LM Studio without provider-specific code;
- `openrouter`, added 2026-09-14 after the first real setup: the same OpenAI-compatible client with the base URL filled in, OpenRouter's usage accounting requested so each run records its cost, and the app named in the headers. Three lines instead of four, and no "model URL" to look for;
- `fake`, a test double that returns fixtures from `examples/`, used by every automated check.

Configuration lives only in the environment file (`.env` for contributors, `.env.release` for the packaged installation): provider, model name, API key and, for compatible endpoints, the base URL. The key is never stored in the database, never sent to the browser and never logged. The interface has a Model setup column that reports which provider is configured (showing at most the last characters of the key) and the exact lines to add; the document cards link to it when nothing is configured.

Two properties are required of any adapter: structured output validated with Zod against the document schema, and a run record for every call (provider, model, prompt name and version, tokens, latency, cost when the provider reports it, outcome). Grounding is checked by the application after the call, not by the prompt: every evidence reference must point at a record in the frozen input snapshot, and numbers in generated text must appear in the cited evidence. Violations are shown as warnings in the review view.

A second mode needs no integration at all. In paste-back mode the app builds the same prompt and shows it with the input snapshot; the user runs it in any assistant they already have, including a chat subscription or a phone app, and pastes the JSON answer back. The answer passes through the same schema validation and grounding check and produces the same run record, marked as pasted. This is the zero-setup path and the path for people who prefer not to hold an API key.

## Alternatives considered

MCP server exposed by the app. The user's harness would read the facts and posting through app operations and write drafts back. It reuses a subscription the user already pays for, which is a real advantage. Against it: for a new user it is more setup than one key (install and authenticate a harness, register the server, approve tools); the harness's model writes the document, so the app cannot own the prompt version, the frozen snapshot or the run record and can only validate what arrives; and the packaged installation runs in a container while the harness runs on the host, so the transport is HTTP with authentication from the first day rather than local stdio. Document 06 also notes that a harness controlling the app and the app calling a model are opposite directions. MCP remains a plausible additive surface later, because the operations it would expose are the same ones the adapter path needs.

Harness as a subprocess. The app would run an installed CLI in non-interactive mode with a JSON schema and keep ownership of the run. It cannot run inside the release container, requires the CLI installed and logged in on the host, and whether a chat subscription may be used this way by a third-party application depends on the provider's terms, which were not verified. Left as a personal experiment, not a documented path.

Storing the key in the database. A plain-text row puts a live billing credential into every backup dump. An encrypted row needs a secret in the environment file to decrypt it, so it is exactly as safe as keeping the key in that file and only buys a settings form. The maintainer chose the environment file: the audience that installs from a Git checkout can edit one file, and the safest arrangement is also the simplest.

A single provider. Simpler to test and document, but the user base for a self-hosted tool spans providers and local models. The adapter interface is the same for all four; the cost is that quality claims are limited to the providers the synthetic evaluation set has been run against, which the documentation states.

## Consequences

- No phone or claude.ai access to a locally running installation. That requires exposing the app to the internet with authentication, which documents 03 and 09 defer to a separate design. Paste-back gives a phone workflow without it.
- Every check in CI runs with the fake adapter. Real-model behaviour is measured by `pnpm eval` on the synthetic cases, by whoever holds a key, and the results are reported in pull requests rather than assumed.
- The adapter is infrastructure, not a business module: `src/infrastructure/model/` holds the interface, the AI SDK class, the fake and the factory. The Documents module receives an adapter and a snapshot and never knows which provider answered.
- Reconsider when a hosted or multi-user mode exists (then credentials belong to accounts), when a harness integration has a verified recipe for the packaged installation, or when provider-specific features (caching, batch) matter enough to justify per-provider code.
