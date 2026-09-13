# ADR 003 — Local packaging and quickstart

Date: 2026-09-13. Status: proposed.

## Context

PostgreSQL is selected, but ordinary users should not install/configure a database and development runtimes manually. Contributors need editable source and repeatable checks.

## Decision proposal

Ship a tested Docker Compose release with pinned application/database images, persistent volumes, health checks, and a migration task. Supply a first-run configuration path that does not overwrite data. Keep a separate documented contributor mode using local Node and the same PostgreSQL service.

## Alternatives

Native prerequisites are smaller for existing developers but less predictable for new users. A native desktop installer may eventually remove terminal/Docker friction but adds packaging and update work. Requiring a preinstalled agent CLI helps only its existing users and cannot replace the database/application installation.

## Consequences and reconsideration

Docker installation remains a prerequisite and needs troubleshooting. Test supported OS/CPU combinations and upgrades before advertising support. A desktop distribution becomes worthwhile if installation drop-off remains a major adoption barrier after the Compose path is reliable.
