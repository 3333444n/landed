# ADR 001 — Local TypeScript application with PostgreSQL

Date: 2026-09-13. Status: accepted and implemented; packaging is decided in [ADR 003](003-local-packaging.md).

## Context

The maintainer is comfortable with JS/TS, Next.js, Node, and PostgreSQL. The application must store relational career/application data locally and may later need vector retrieval.

## Decision

Use TypeScript with Next.js running on Node.js and local PostgreSQL. Keep business responsibilities in modules behind application operations. Add pgvector only when a retrieval requirement warrants it; embeddings remain derived data.

## Alternatives

SQLite reduces installation work but is not the selected database. React/Vite plus a separate Node/FastAPI API adds runtime and contract coordination without a current requirement. Other UI frameworks introduce a new learning surface without improving the first job-search outcome.

## Consequences and reconsideration

PostgreSQL needs managed startup, persistent storage, migrations, and backup/restore. A packaged local installation must hide routine administration from ordinary users. Reconsider separate runtimes when independent execution/isolation or concrete dependencies demand them; do not choose a service per module.
