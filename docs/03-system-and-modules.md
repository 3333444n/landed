# 03 — System and modules

Status: stack, Profile, Jobs and Applications modules and packaged runtime implemented; Documents module, model adapter and PDF rendering implemented (Phase 1b, ADR 006). Updated 2026-09-14.

## System boundary

The browser connects to a local Next.js server. Server-side application operations validate requests and use PostgreSQL. The packaged installation (`compose.release.yml`, started by `scripts/landed.sh`) runs three Compose services: `db` (pinned PostgreSQL 17 image, named volume, no host port), `migrate` (a one-shot task that builds the application image and applies `db/migrations` through `db/migrate.mjs`, then exits) and `web` (the same image, started only after `migrate` succeeds and `db` is healthy, published on 127.0.0.1 only). Contributor mode is different: `docker-compose.yml` runs only PostgreSQL, published on 127.0.0.1:5432, and Next.js runs from the checkout with `pnpm dev`. The two Compose projects have separate names and volumes.

This is a modular application plus its database, not a collection of microservices. Browser rendering and server execution remain separate even though Next.js supplies both. Next.js uses React; Vite is an alternative build/dev tool, not a React replacement.

Runtime view:

```mermaid
flowchart LR
  subgraph local["Your computer: one local installation"]
    browser["Browser UI"] -->|"HTTP on 127.0.0.1"| app["Next.js server<br/>module-owned use cases"]
    app -->|"SQL transactions"| db[("PostgreSQL")]
    app -->|"read / write"| files[("Local files<br/>backups now, PDFs in Phase 1b")]
    migrate["migrate task (one-shot)<br/>applies db/migrations, then exits"] -.->|"before web starts"| db
  end
  app -.->|"outbound HTTPS, Phase 1b onward"| providers["External providers<br/>models (ADR 006), later job sources"]
```

This is a logical runtime view: PostgreSQL is a process/container with its own volume, and the `migrate` task is a Compose service that runs once per `start` rather than a product component. The diagram abstracts volumes and networks.

Phase 0 and 1a have no runtime network dependency beyond local processes. Installation/image downloads require internet. From Phase 1b the web service makes outbound HTTPS calls to the model provider configured in the environment file, and only then; with no provider configured, paste-back mode keeps everything local. Later job/search providers require outbound access too. LAN/public access and remote MCP require a separate access/security design.

## Ownership and dependencies

Phase 0/1 module boundaries:

```mermaid
flowchart TB
  model["Model adapter<br/>(src/infrastructure/model, Phase 1b)"]
  pdf["PDF rendering<br/>(component inside Documents, Phase 1b)"]
  profile["Profile<br/>Phase 0: career facts and achievements"]
  jobs["Jobs<br/>Phase 1a: pasted text and metadata (implemented)"]
  documents["Documents<br/>Phase 1b: runs, snapshots, revisions, review"]
  applications["Applications<br/>Phase 1a: status and notes (implemented)"]
  compose["Composition in src/app/jobs<br/>pursue-job (1a), generate-document (1b)"]
  compose -->|"read facts"| profile
  compose -->|"read posting"| jobs
  compose -->|"read pursuit"| applications
  compose -->|"snapshot + adapter"| documents
  documents -->|"structured generation"| model
  documents -->|"render content"| pdf
  compose -->|"run and draft facts for the chip"| applications
```

Arrows are code calls or dependencies, not HTTP connections or deployment boundaries. Jobs and Applications are implemented; in Phase 1a Applications only stores a job id and the two are joined by the composition code in `src/app`. In Phase 1b the composition function in `src/app/jobs` reads the profile, the job and the application, builds the input snapshot as plain data, and hands it with the adapter to Documents, so Documents depends on none of the other modules' code. Matching, Research and Discovery enter in Phase 2 and 3.

| Module | Owns | May depend on |
|---|---|---|
| Profile | Career records, skills, editable achievements | Database adapter |
| Jobs (implemented) | Raw pasted posting, title, company, location, source URL, availability | Database adapter; later import adapters |
| Documents (implemented) | Generation runs, input snapshots, saved revisions, grounding warnings, review state, artifact metadata, PDF rendering | The model adapter interface and the artifact directory; receives snapshots as data, imports no other module |
| Applications (implemented) | Pursuit status, notes, submission time, the derived job status rule; later exact material references | Stores a job id; Documents read operations in Phase 1b |
| Matching (later) | Eligibility checks and explained assessments | Profile and Jobs reads, model/retrieval adapters |
| Research (later) | Sourced findings and bounded research runs | Jobs reads, search/fetch adapters, model runtime |
| Discovery (later) | Provider adapters, schedules, ingestion runs | Jobs write operations; orchestration can then invoke Matching/Documents |

PDF rendering is a small component within Documents initially, not a separately deployed service. It converts validated structured content through templates into PDFs. Extract an independent package only if real reuse or isolation needs emerge. Model integration is infrastructure, not a business module that knows how resumes work: `src/infrastructure/model/` holds the `ModelAdapter` interface (a structured-output request with a Zod schema in, a validated value with usage or a classified failure out), the AI SDK implementation as a class holding the configured provider client, the fake adapter that answers from `examples/generation`, and the factory that reads the environment ([ADR 006](adr/006-model-access-path.md)). The Model setup column under `/settings/model` reads the same configuration and shows its status without the key.

Keep cross-module workflows at an application composition boundary; avoid circular imports. The implemented example is `src/app/jobs/pursue-job.ts`: pasting a posting must create the job and its application together, so the function opens one transaction and passes the handle to the Jobs and Applications use cases, whose own transactions nest as savepoints inside it; a failure in either rolls back both. Neither module imports the other, and the owner-aware foreign key in the database checks the link. Documents will likewise store an opaque application ID without importing Applications operations; an application-level use case will coordinate creating the application and generating its materials. Database foreign keys do not mandate circular code dependencies.

## Repository shape

```text
src/
  app/                   Next.js routes; the path is the navigation stack (DESIGN.md "Layout")
    layout.tsx           the Shell: sidebar or drawer plus the row of columns
    about/               hub column (layout.tsx) with one card per record type
      profile/           the profile form column
      work-history/ education/ projects/ skills/ achievements/
                         each: layout.tsx (list column + add control), page.tsx (placeholder),
                         new/page.tsx (blank form column), [id]/page.tsx (edit column with delete),
                         actions.ts (Server Actions) and the form component
    jobs/                layout.tsx (list column; the client JobList and JobListControls apply the
                         filter and sort search parameters), page.tsx (placeholder), new/page.tsx
                         (paste form), [id]/layout.tsx (job column: status form, blocks, delete),
                         [id]/page.tsx (renders nothing), [id]/description/ and [id]/company/,
                         actions.ts, pursue-job.ts (composition), list-jobs.ts, list-params.ts
    jobs/[id]/resume/ cover-letter/ recruiter-message/
                         Phase 1b: layout.tsx (review column with inline editing), page.tsx (null),
                         evidence/, paste/, runs/ columns, pdf/route.ts download; document-actions.ts,
                         generate-document.ts and snapshot.ts (composition)
    settings/model/      Phase 1b: Model setup column (configuration status, no key)
    form-state.ts        shared action result shape and form helpers
    tokens.css           design tokens from DESIGN.md (the only place values live)
  modules/
    shared/              contracts.ts (Result, ModuleError, field helpers), service.ts (BaseDeps, error mapping)
    profile/             schema.ts, contracts.ts, rules.ts, repository.ts, service.ts, index.ts
    jobs/                same shape; postings
    applications/        same shape; pursuits and the derived job status rule
    documents/           Phase 1b: same shape plus prompts/ (versioned prompt builders) and pdf/ (templates)
  components/            shared presentation components (Shell, Column, Toolbar, Card, Field, ...)
  infrastructure/        database pool, configuration, model/ (adapter interface, AI SDK class, fake, factory)
db/migrations/           generated SQL migrations and drizzle-kit journal
db/migrate.mjs           migration runner used inside the release image (production dependencies only)
db/init/                 creates the test database on first start of the development database
docker-compose.yml       development database only
Dockerfile               multi-stage release image (Next.js standalone output, non-root user)
compose.release.yml      packaged installation: db, migrate, web
scripts/                 landed.sh / landed.ps1 launcher; db-backup.sh / db-restore.sh for contributors
tests/integration/       Vitest against real PostgreSQL
tests/e2e/               Playwright browser journeys
examples/                synthetic data; generation/ holds the evaluation cases and fixtures (Phase 1b)
tests/eval/               the evaluation cases against the configured real provider (pnpm eval, never in CI)
docs/                    numbered design and ADRs
```

Inside a module: `schema.ts` declares tables, `contracts.ts` holds Zod input schemas and result types (browser-safe), `rules.ts` holds pure functions, `repository.ts` holds Drizzle queries over a database or transaction handle, `service.ts` holds use cases that open transactions and map database errors to typed results, and `index.ts` is the only import path for callers. Layouts render their own column followed by `children`, so a route like `/about/achievements/[id]` produces the hub, the list and the edit form as sibling columns and CSS shows the last two (one on a phone); the old Phase 0 addresses redirect to their new columns from `next.config.ts`. Server Actions in `src/app` import from `index.ts`; a client component that needs a contract imports `contracts.ts` directly so no database code reaches the browser bundle.

Documents has the same file shape plus `prompts/` (one versioned prompt builder per document type), `pdf/` (the two react-pdf templates and the renderer) and `artifacts.ts` (atomic file writes under `LANDED_ARTIFACT_DIR`, a named volume in the packaged installation, with metadata rows inserted only after the file exists). The PDF downloads are the first Route Handlers in the app (`pdf/route.ts` under the resume and cover-letter routes), because a file download is not a form submission.

Framework handlers translate requests, validate transport input, invoke operations, and return useful errors. Domain rules live in modules. Database constraints back up critical rules. Persistence uses Drizzle: the schema is TypeScript, queries stay close to SQL, and migrations are generated as reviewable SQL files ([ADR 004](adr/004-drizzle-persistence.md)). Do not maintain multiple persistence implementations for hypothetical portability.

## Sources

- [Next.js](https://nextjs.org/docs) — React framework with server capabilities.
- [Vite](https://vite.dev/guide/) — frontend development/build tooling.
- [Docker Compose](https://docs.docker.com/compose/intro/compose-application-model/) — services, networks, volumes, and application configuration.
