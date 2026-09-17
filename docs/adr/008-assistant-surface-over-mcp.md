# ADR 008 — Assistant surface over MCP

Date: 2026-09-16. Status: accepted, implementation in progress. Everything below is decided; it is implemented by the pull requests that follow this record (the endpoint and tools, the Settings column and launcher token, the skill, then `add_job`). Until each merges, [doc 09](../09-decisions-and-readiness.md) says what exists.

## Context

ADR 006 chose the direction in which the app calls a model provider through one adapter, with paste-back as the path that needs no key. It named the opposite direction, the user's own assistant calling the app through MCP, as a plausible additive surface later, and gave two reasons to wait: the packaged installation runs in a container while the assistant runs on the host, so the transport would be HTTP with authentication from the first day; and the assistant's model writes the document, so the app can only validate what arrives.

Two facts have changed since:

- The container and host split has a standard answer. Self-hosted applications expose a local HTTP endpoint on 127.0.0.1, and the assistant on the host connects to it directly over Streamable HTTP. The packaged installation already publishes its web port there, so nothing new needs to run and nothing goes on the internet.
- The vendors of Claude Code, Codex and Claude Desktop document local and remote MCP servers as the way an assistant uses an application, each with a one-line registration for an HTTP server and a bearer header.

The reason to add the surface is the assistant people already pay for. Paste-back lets them use it by hand, one document at a time, copying the prompt out and the JSON in. An assistant surface lets the same subscription run the whole loop: read the job and the career facts, write the three documents, submit them for Landed's checks, fix the warnings, render the PDFs. No API key and no per-token cost. The second reason to wait turns out to be acceptable: Landed keeps the snapshot, the schema validation, the grounding check, the revisions, the run record and the PDF; only the writing moves to the assistant, exactly as in paste-back.

The constraints from documents 01 and 07 still apply: the packaged installation runs in Docker Compose on the user's computer with no hosted service, every standard check runs without paid model access, and the API key and paste-back paths stay unchanged.

## Decision

Landed exposes its operations to the user's assistant through an MCP endpoint.

- Transport and place: Streamable HTTP at `/mcp`, inside the same Next.js process as the interface. The packaged installation reaches it at `http://127.0.0.1:<port>/mcp`, the port the browser already uses. The library is `@modelcontextprotocol/server` v2 used directly: its stateless handler calls the server factory once per request with that request, so the route can hand the verified profile, the module dependencies and the request origin to the tools as plain closure inputs. Vercel's `mcp-handler` (2.1.1 reviewed) wraps the factory in a zero-argument function and discards that per-request context.
- Authentication: a bearer token, `LANDED_MCP_TOKEN`, read from the environment file only (`.env` for contributors, `.env.release` for the packaged installation) and minted by the launcher the way `POSTGRES_PASSWORD` is. Without the token the endpoint answers 503 and says which variable to set; with a missing or wrong bearer it answers 401 and no `WWW-Authenticate` challenge. The token is shown in the browser in one place, the Settings column "Connect your assistant", where the copyable registration blocks need it. Unlike the provider key it protects local data the browser already displays: it is a local capability, not a billing credential.
- Host and Origin validation for the whole application, not only `/mcp`: the `Host` header's hostname must be `localhost`, `127.0.0.1` or `::1` (or a name listed in `LANDED_ALLOWED_HOSTS`, empty until a remote design uses it), and an `Origin` header, when present, must name one of the same hosts; anything else is refused with 403 before any handler runs. The reason is the token page: a server that answered any `Host` could be read through DNS rebinding. The MCP transport specification separately requires local servers to validate `Origin` for the same attack.
- Run mode `assistant` beside `adapter` and `pasted`, with revision source `assistant`. The lifecycle is in [doc 05](../05-workflows-and-failures.md): a brief opens a queued run, a submission finishes it, and an invalid answer fails it and opens a fresh one.
- Tools call module operations through the composition layer in `src/app`, never SQL and never a module's repository, so an assistant run passes the same schema validation, grounding check and run record as a generated or pasted one. The tool contract is in [doc 06](../06-ai-and-integrations.md).
- Scope of this release: reads and drafts. The assistant can list and read jobs, fetch a document brief, submit a document, read and edit a revision and render the PDFs; `add_job` follows in its own pull request. No deletion, no application status change, no profile write. Landed never marks anything applied and never sends anything.
- Who writes: the assistant's model. Landed validates the answer, checks grounding and records the run. The run record's provider is taken from the client's `User-Agent` and its model from what the assistant reports about itself when it asks for the brief; both are best effort and the Runs column labels them as reported, not verified.
- A portable skill file teaches the assistant the workflow (preconditions, posting intake, a fit evaluation, brief, write, submit, fix, render, report); the Claude Code plugin wraps the same file. The rules the assistant must follow while writing are returned by the brief tool itself, so every assistant sees them whether or not the skill is installed.

## Alternatives considered

A stdio shim package. A small process the assistant launches, which forwards to the container. It is a second artifact to version and install, and it buys nothing: Claude Code, Codex and Claude Desktop (through its remote bridge) all speak HTTP to localhost.

The token in the database. It would allow a settings form and rotation from the browser, but it puts a secret into every backup dump, and the environment file already holds the other secret the installation depends on. ADR 006 reached the same conclusion for the provider key.

Host validation without a token. Origin and Host checks stop a remote website from reaching the endpoint through the browser, but not a local process or another user of the computer. The MCP transport specification says local servers should authenticate, and the later remote design reuses the same bearer behind a tunnel, so the token exists from the first day.

MCP sampling (the server asking the client's model to write). It would let Landed keep the prompt and the run record whole. Against it: the major clients do not support it, the server SDK notes it works only on its legacy path, and the 2026-07-28 revision of the specification deprecates the Sampling feature and suggests integrating with a model provider directly, which is what ADR 006 already does.

OAuth challenges through `WWW-Authenticate`. Answering 401 with a resource-metadata challenge is the remote pattern. For a local shared secret it adds nothing and makes clients start a discovery flow that has nowhere to go. The remote design will add OAuth where it belongs.

## Consequences

- This is the first authenticated surface in the codebase and the first place a Host check runs. The web port stays published on 127.0.0.1 only; exposing it further still needs the separate access and security design documents 03 and 09 keep.
- `pnpm verify` runs the endpoint against the test database with the MCP client in process, so every tool is exercised without a network and without a paid model; the fake adapter is not involved because no model is called.
- Assistant runs carry no token usage and no cost; the run record shows the mode, the reported provider and model, and the outcome.
- The Runs column and the job chip treat a queued assistant run like a queued paste-back run: "Crafting documents" until a submission arrives or a newer brief supersedes it.
- The Settings column becomes a hub with two cards, Model setup and Connect your assistant.
- Remote access (claude.ai, a phone) is a separate ADR that reuses this endpoint behind a tunnel with the bearer first and OAuth later. Profile writes from the assistant (new achievements, new skills) are a later stack with their own rule about writing facts back.
- Reconsider when a hosted or multi-user mode exists (then the token belongs to an account), or when the assistant clients converge on a transport or authentication shape that makes the current choices redundant.
