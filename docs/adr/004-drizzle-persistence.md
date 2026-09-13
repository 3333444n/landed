# ADR 004 — Drizzle for persistence

Date: 2026-09-13. Status: accepted.

## Context

The application stores relational career, job, and application data in PostgreSQL and must ship versioned schema migrations that inexperienced users never run by hand. Contributors need typed queries they can read without learning a bespoke data-access layer. The maintainer wants the relational model visible, not hidden.

## Decision

Use Drizzle ORM. The schema is declared in TypeScript per module, queries use Drizzle's SQL-shaped query builder, and migrations are generated with drizzle-kit as SQL files that are committed and reviewed. Raw SQL through Drizzle's `sql` tag is allowed where the builder is awkward.

## Alternatives

Raw SQL with the `pg` driver and hand-written migrations: maximum transparency, but untyped strings and repeated row mapping discourage contributions. Kysely: a typed query builder close to SQL, with a smaller community and no schema-driven migrations. Prisma: widely used, but its own schema language and client hide the SQL and add a heavier runtime.

## Consequences and reconsideration

Generated migrations must be reviewed before commit; drizzle-kit is not trusted blindly. Complex reporting queries may use raw SQL. Reconsider only if Drizzle's PostgreSQL support lags a feature the application depends on, such as pgvector operators, at which point the affected queries move to raw SQL rather than the whole layer changing.
