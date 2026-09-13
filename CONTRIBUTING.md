# Contributing

Start at the [documentation index](docs/00-index.md) and the [decision register](docs/09-decisions-and-readiness.md). Phase 0 (career data entry) is implemented; later phases are design only. Distinguish accepted decisions from suggestions and avoid describing planned features as implemented.

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

Paid model credentials are never required for standard checks.

## Commits and pull requests

Commit messages follow `<type>(<scope>): <short imperative description>`, for example `feat(profile): add education records` or `fix(achievements): keep typed values after a validation error`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`. Scope is the module or area touched.

Pull requests use the template: **What** (one or two sentences), **Why** (the problem, link the issue), **How** (decisions, trade-offs, what to review first), **Testing** (what was run, new tests, manual steps for UI). Keep each change focused on one concern.

## Rules that are easy to miss

- Achievements are edited in place; do not add revision history without a revised decision.
- Every schema change ships with its generated migration in `db/migrations`, reviewed like code, and with updates to [doc 04](docs/04-data-model.md).
- UI follows [DESIGN.md](DESIGN.md); tokens live in `src/app/tokens.css`, never in component files.
- Modules expose plain functions from `index.ts`; framework code never imports a module's repository or schema.
- Do not include personal profiles, credentials, real resumes, or private notes in patches, screenshots, tests or examples. Use the [fictional examples](examples/README.md).
- For documentation changes, check relative links and keep the numbered documents consistent; diagrams are Mermaid blocks edited with the text. See the [documentation policy](docs/08-contributions-and-documentation.md).
