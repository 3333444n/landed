# Landed

Get the interview. Landed is a locally run job-search application that turns your real career evidence into tailored resumes, cover letters, and recruiter messages, and tracks every application. It rewrites and reorganizes your facts; it never invents them.

**Status: Phase 1b complete (2026-09-14) and installable with Docker. You can enter and keep your career data locally, paste job postings, track each application's status, and generate a reviewed resume, cover letter and recruiter message for each job, with one-page PDFs.** What works today: profile, work history, education, projects, skills and achievements; jobs and their applications with a status list you can filter and sort; per job, a generated resume, cover letter and recruiter message that cite your own records, flag unsupported claims, are edited in place and downloaded as PDF; all stored in PostgreSQL on your machine, with backup and restore. An AI account is optional: bring a key for Anthropic, OpenAI, the Vercel AI Gateway or any OpenAI-compatible endpoint (OpenRouter, Ollama), or use paste-back mode and run the prompt in whatever assistant you already have ([ADR 006](docs/adr/006-model-access-path.md)).

The stack is TypeScript, Next.js on Node.js, and PostgreSQL. Later milestones add link import and matching, research, discovery, and interview tracking.

## Install

To use it: with Docker installed, clone the repository and run `sh scripts/landed.sh start` (Windows: `scripts\landed.ps1 start`), then open http://127.0.0.1:3000. Details, backup and troubleshooting are in the [user quickstart](docs/07-quickstart-contract.md#ordinary-user-path-tested-on-macos-with-docker-desktop-2026-09-13); tested on macOS so far.
To work on it: the [contributor quickstart](docs/07-quickstart-contract.md#contributor-path-tested) needs Node 22, pnpm and Docker.

## Explore the design

- [Numbered documentation](docs/00-index.md)
- [Product scope and phases](docs/01-product-and-phases.md)
- [Architecture and module boundaries](docs/03-system-and-modules.md)
- [Domain model](docs/02-domain-model.md) and [data model](docs/04-data-model.md)
- [Quickstart](docs/07-quickstart-contract.md)
- [Fictional examples](examples/README.md)
- [Design system](DESIGN.md) for anyone touching the interface, and [document design](DESIGN-DOCS.md) for the produced PDFs

## Contribute

Start with [CONTRIBUTING](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
