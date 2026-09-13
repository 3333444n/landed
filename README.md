# Landed

Get the interview. Landed is a locally run job-search application that turns your real career evidence into tailored resumes, cover letters, and recruiter messages, and tracks every application. It rewrites and reorganizes your facts; it never invents them.

**Status: Phase 0 in progress. You can enter and keep your career data locally; no generated materials yet, and no packaged one-command installation.** What works today: profile, jobs, education, projects, skills and achievements, entered in the browser and stored in PostgreSQL on your machine. No AI account is needed.

The stack is TypeScript, Next.js on Node.js, and PostgreSQL. Later milestones add tailored resumes, cover letters, recruiter messages, PDFs, matching, research, discovery, and interview tracking.

## Run it

Follow the [contributor quickstart](docs/07-quickstart-contract.md#contributor-path-tested). It needs Node 22, pnpm and Docker. A packaged installation for people who do not want a development setup is designed but not built yet.

## Explore the design

- [Numbered documentation](docs/00-index.md)
- [Product scope and phases](docs/01-product-and-phases.md)
- [Architecture and module boundaries](docs/03-system-and-modules.md)
- [Domain model](docs/02-domain-model.md) and [data model](docs/04-data-model.md)
- [Quickstart](docs/07-quickstart-contract.md)
- [Fictional examples](examples/README.md)
- [Design system](DESIGN.md) for anyone touching the interface

## Contribute

Start with [CONTRIBUTING](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
