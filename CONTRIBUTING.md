# Contributing

Start at the [documentation index](docs/00-index.md) and the [decision register](docs/09-decisions-and-readiness.md). Phase 0 (career data entry), Phase 1a (jobs and applications), Phase 1b (generated materials, review, PDFs, model access) and the assistant surface ([ADR 008](docs/adr/008-assistant-surface-over-mcp.md), 2026-09-16) are implemented. The profile-management extension ([ADR 009](docs/adr/009-profile-management-over-mcp.md)) adds 18 tools and is merged. The context and canonical-company work under ADR 011 extends the endpoint to 42 tools and merged in PRs #43–47 on 2026-09-23. Remaining later-phase capabilities are design only. Distinguish accepted decisions from suggestions and avoid describing planned features as implemented.

## Set up

The [contributor quickstart](docs/07-quickstart-contract.md#contributor-path-tested) has the tested commands. In short: Node 22, pnpm, Docker; `pnpm install`, `pnpm db:up`, `pnpm db:migrate`, `pnpm dev`.

## Checks

The policy, in the maintainer's words: during implementation, run the smallest relevant test suite for rapid feedback. As the change crosses module boundaries, run the corresponding integration tests. For UI changes, manually exercise the changed journey and add or update appropriate automated coverage. Before opening a PR, run the repository's complete required local verification suite. If any required test cannot be run, explicitly state why in the PR. Determine testing scope from the behavioural blast radius, not merely the files changed.

Three scripts implement the levels:

| Script | Runs | Needs | When |
|---|---|---|---|
| `pnpm check` | `format:check`, `lint`, `typecheck`, `test` (unit), `scripts/check-skill-sync.sh` (the plugin's copy of the assistant skill matches `.agents/skills/landed/SKILL.md`) | nothing but Node | constantly while coding; seconds |
| `pnpm verify` | `check` + `test:integration` + `scripts/check-migrations.sh` | `pnpm db:up` and `.env.test` | when a change touches persistence, a Server Action, a route, or a module's public surface; a minute or two |
| `pnpm verify:full` | `verify` + `build` + `CI=true test:e2e` (the journeys against the production build, as CI runs them) | the above plus Playwright's Chromium | before opening any pull request; several minutes |

Pick the level from the blast radius. A pure rule or a component: `check`. Anything that reads or writes the database, a Server Action, a route, or a module's public surface: `verify`. Anything a user journey touches, a layout, a migration, a dependency bump, packaging: `verify:full`. When a required level cannot run (no Docker, no browser), say so in the PR's Testing section instead of skipping silently.

CI runs the same steps on every pull request (`.github/workflows/ci.yml` calls the same migration script). Two checks stay outside the scripts:

- `pnpm eval` calls the real provider configured in `.env` with the synthetic cases in `examples/generation/cases` and prints grounding warnings, tokens, latency and cost. It spends money, is never part of CI, and is required only when you change a prompt, a document schema or a provider; paste its table into the pull request. Every other check runs with the fake model adapter (`LANDED_MODEL_PROVIDER=fake` in `.env.test`), which answers from `examples/generation/fixtures`, so no key is ever needed.
- The packaged installation is `Dockerfile`, `compose.release.yml`, `db/migrate.mjs`, `scripts/landed.sh`, `scripts/landed.ps1` and `.env.release.example`. CI does not build the image; a change to any of these files must re-run the checks listed under "Required verification" in [doc 07](docs/07-quickstart-contract.md) (fresh `start`, restart, backup and restore, factory reset) and state the results in the pull request.

## Commits and pull requests

Commit messages follow `<type>(<scope>): <short imperative description>`, for example `feat(profile): add education records` or `fix(achievements): keep typed values after a validation error`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`. Scope is the module or area touched.

Pull requests use the template: **What** (one or two sentences), **Why** (the problem, link the issue), **How** (decisions, trade-offs, what to review first), **Testing** (what was run, new tests, manual steps for UI). Keep each change focused on one concern.

### Stacked pull requests

Prefer independent branches from `origin/main`. Use a stack only when one change genuinely depends on another and splitting improves review. In a stack (`branch-a → main`, `branch-b → branch-a`, `branch-c → branch-b`) each pull request targets its immediate parent, so its diff shows only its own layer. State the dependency and the merge order at the top of every PR in the stack. Never merge a child before its parent. This repository merges with merge commits, so a child needs no restack after its parent merges and GitHub retargets it to `main` when the parent branch is deleted; if a parent were ever squash-merged, rebase the children onto `main` before merging them.

## Rules that are easy to miss

- Achievements are edited in place; do not add revision history without a revised decision.
- Every database schema change ships with its generated migration in `db/migrations`, reviewed like code, and with updates to [doc 04](docs/04-data-model.md).
- UI follows [DESIGN.md](DESIGN.md); colours live in `src/app/palettes.css` and every other token in `src/app/tokens.css`, never in component files, and components use only the semantic tokens. The produced PDFs follow [DESIGN-DOCS.md](DESIGN-DOCS.md).
- The model key comes from the environment only (`LANDED_MODEL_API_KEY`); never store it, log it, or send it to the browser. Prompts keep pasted postings in labelled data blocks, never in the instructions, and bump the prompt version when the text changes.
- Modules expose plain functions from `index.ts`; framework code never imports a module's repository or schema. The `/mcp` tools (`src/app/mcp/tools.ts` and `profile-tools.ts`) call the composition functions in `src/app` and module operations, never a repository, and never throw.
- The assistant token (`LANDED_MCP_TOKEN`) comes from the environment only; never store it, log it or render it anywhere but the Connect your assistant column. The assistant workflow is edited in `.agents/skills/landed/SKILL.md` and copied to `plugins/landed/skills/landed/SKILL.md`; `pnpm check` fails on drift.
- Do not include personal profiles, credentials, real resumes, or private notes in patches, screenshots, tests or examples. Use the [fictional examples](examples/README.md).
- For documentation changes, check relative links and keep the numbered documents consistent; diagrams are Mermaid blocks edited with the text. See the [documentation policy](docs/08-contributions-and-documentation.md).
