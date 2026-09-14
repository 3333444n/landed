# Generation examples (fictional)

Everything here is fictional and mirrors `examples/demo-profile.json`; no real person, employer or posting.

- `fixtures/`: the answers the fake model adapter returns (`LANDED_MODEL_PROVIDER=fake`), one file per prompt name. `*.ungrounded.json` variants contain invented names and numbers so tests can see the grounding warnings; the fake adapter returns them when the pasted posting contains `[[fake:ungrounded]]`. `[[fake:invalid]]` and `[[fake:provider-error]]` make it fail instead.
- `cases/`: profile and posting pairs for the evaluation set. `pnpm eval` (the vitest project in `tests/eval`) builds the snapshot for each case, calls the configured real provider for all three documents, and prints the grounding warnings, tokens, latency and cost. It needs `LANDED_MODEL_*` set in `.env`; CI never runs it. `EVAL_CASES=fit,mismatch pnpm eval` limits the cases.

Evidence ids in the fixtures are the record ids of the demo profile, so a snapshot built from those records validates cleanly.
