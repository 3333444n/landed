# Contributing

Start at the [documentation index](docs/00-index.md) and the [decision register](docs/09-decisions-and-readiness.md). Phase 0 (career data entry) and Phase 1a (jobs and applications) are implemented; Phase 1b (generated materials) is in progress and later phases are design only. Distinguish accepted decisions from suggestions and avoid describing planned features as implemented.

## Set up

The [contributor quickstart](docs/07-quickstart-contract.md#contributor-path-tested) has the tested commands. In short: Node 22, pnpm, Docker; `pnpm install`, `pnpm db:up`, `pnpm db:migrate`, `pnpm dev`.

## Checks

CI runs these on every pull request; run them locally first:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test              # unit tests
pnpm test:integration  # needs PostgreSQL (pnpm db:up) and .env.test
pnpm test:e2e          # browser journey, same requirements
pnpm build
pnpm db:generate       # must report no schema changes; otherwise commit the new migration
```

Paid model credentials are never required for standard checks: `.env.test` selects the fake model adapter (`LANDED_MODEL_PROVIDER=fake`), which answers from `examples/generation/fixtures`. The only command that calls a real provider is `pnpm eval`, which runs the synthetic cases in `examples/generation/cases` against the provider configured in `.env` and prints grounding warnings, tokens, latency and cost; run it when you change a prompt or add a provider, and paste its table into the pull request.

The packaged installation is `Dockerfile`, `compose.release.yml`, `db/migrate.mjs`, `scripts/landed.sh`, `scripts/landed.ps1` and `.env.release.example`. CI does not build the image; a change to any of these files must re-run the checks listed under "Required verification" in [doc 07](docs/07-quickstart-contract.md) (fresh `start`, restart, backup and restore, factory reset) and state the results in the pull request.

## Commits and pull requests

Commit messages follow `<type>(<scope>): <short imperative description>`, for example `feat(profile): add education records` or `fix(achievements): keep typed values after a validation error`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`. Scope is the module or area touched.

Pull requests use the template: **What** (one or two sentences), **Why** (the problem, link the issue), **How** (decisions, trade-offs, what to review first), **Testing** (what was run, new tests, manual steps for UI). Keep each change focused on one concern.

## Rules that are easy to miss

- Achievements are edited in place; do not add revision history without a revised decision.
- Every schema change ships with its generated migration in `db/migrations`, reviewed like code, and with updates to [doc 04](docs/04-data-model.md).
- UI follows [DESIGN.md](DESIGN.md); tokens live in `src/app/tokens.css`, never in component files. The produced PDFs follow [DESIGN-DOCS.md](DESIGN-DOCS.md).
- The model key comes from the environment only (`LANDED_MODEL_API_KEY`); never store it, log it, or send it to the browser. Prompts keep pasted postings in labelled data blocks, never in the instructions, and bump the prompt version when the text changes.
- Modules expose plain functions from `index.ts`; framework code never imports a module's repository or schema.
- Do not include personal profiles, credentials, real resumes, or private notes in patches, screenshots, tests or examples. Use the [fictional examples](examples/README.md).
- For documentation changes, check relative links and keep the numbered documents consistent; diagrams are Mermaid blocks edited with the text. See the [documentation policy](docs/08-contributions-and-documentation.md).
