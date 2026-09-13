# Fictional example data

`demo-profile.json` is a fixture with invented career records, not a runnable seed or a resume importer. There is no loader for it; the integration tests (`tests/integration`) and browser journeys (`tests/e2e`) take their values from it and enter them through the application's own operations and forms. Its collection names follow document 04; if a loader is added later it must validate the file with the module contracts and must never load into an existing personal database.

The fixture covers a measurable employment achievement, a project achievement without an invented metric, a standalone achievement, optional fields, and reusable skill links. Any future loader must target an isolated demo/test database. The contact address uses the reserved example.com domain.
