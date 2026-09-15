# 08 — Contributions and living documentation

Status: CI, commit conventions, PR template and SECURITY in place; the packaged installation is built from the checkout, no tagged release yet. Updated 2026-09-13.

## Small public-repository baseline

In place: README with truthful feature status and a link to the tested quickstart; LICENSE (MIT); CONTRIBUTING with checks, commit and PR conventions; environment examples with no real credentials; lockfile; synthetic examples; and CI (`.github/workflows/ci.yml`) that runs formatting, linting, type checks, unit tests, integration and browser tests against a PostgreSQL 17 service, a build, and a migration drift check (`pnpm db:generate` must produce no changes); and [SECURITY](../SECURITY.md) with a private reporting channel. CI does not build the release image; packaging changes are verified by hand against the checklist in document 07.

Commits follow `<type>(<scope>): <description>` with the types listed in CONTRIBUTING; pull requests use the What/Why/How/Testing template in `.github/`.

Bug reports specify version/environment, reproduction steps, expected/actual behavior, and sanitized evidence. Encourage documentation fixes and `good first issue` tasks. Require no paid credentials to run standard checks: the model adapter has a fake implementation selected by `LANDED_MODEL_PROVIDER=fake`, and only the optional `pnpm eval` calls a real provider. A tiny fictional profile is the current example (`examples/demo-profile.json`, used as values by the tests); a loader for it does not exist, and the schema and loader must agree before seed data is declared runnable.

Examples do not include real names/contact details from the maintainer. Do not require a contributor to complete their real profile to run tests. Design easy seams for adding a template or a source adapter later, but do not build a plugin marketplace now.

## Keep docs current with changes

1. Domain/rule changes update document 02.
2. Runtime/module changes update document 03 and its Mermaid diagrams.
3. Schema changes update document 04, relationships, migration, and relevant tests together.
4. Behavior/failure changes update document 05.
5. Integration changes update document 06 and the supported setup path.
6. Installation changes update document 07 and its clean-install checks.
7. Scope/decision changes update documents 01/09 and create or supersede an ADR when significant.
8. Visual changes update DESIGN.md at the repository root; the UI and the file must never disagree. Changes to the produced PDFs or the recruiter text update DESIGN-DOCS.md the same way.

The pull-request template asks what was tested; reviewers ask which documents/diagrams are affected, or why none are. Link checking can later be automated; semantic correctness still requires review. No timer can infer that a design diagram remains correct after arbitrary code changes.

Diagrams are Mermaid blocks in the documents themselves: no external tool, no generated files, and GitHub renders them in place. Numbered filenames stay stable; updated dates and Git history record changes. Append a superseding ADR rather than rewriting the history of a significant accepted decision.

## Reference observations

[ai-job-search CONTRIBUTING](https://github.com/MadsLorentzen/ai-job-search/blob/master/CONTRIBUTING.md) makes contribution scope explicit, asks for reproducible fixes, excludes personal profile data, and lists its checks. Its Claude Code-native scope is its choice, not an obligation for this app.

[Resume Matcher CONTRIBUTING](https://github.com/srbhr/Resume-Matcher/blob/main/.github/CONTRIBUTING.md) welcomes small contributions and requests scoped bug reports and tests. The retrieved guide contains legacy development instructions; use its current [SETUP](https://github.com/srbhr/Resume-Matcher/blob/main/SETUP.md) for current installation research. This illustrates why duplicated quickstarts drift.

These are documentation-level observations, not exhaustive source-code audits or claims that either project lacks features.
