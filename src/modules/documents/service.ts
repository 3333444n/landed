/*
 * Use cases for generated materials. The run row is written and committed before the model call
 * and finished after it; no transaction spans the call (docs/05). The module receives the
 * snapshot and the adapter outcome as data and never imports another module.
 */
import type { GenerateOutcome, GenerateUsage } from "@/infrastructure/model";
import { fieldErrorsFromZod, type Result } from "@/modules/shared/contracts";
import {
  mapDatabaseError,
  newId,
  notFound,
  now,
  stale,
  validation,
  type BaseDeps,
} from "@/modules/shared/service";
import {
  contentSchemas,
  editUnitInput,
  pasteBackInput,
  type DocumentContent,
  type DocumentType,
  type GroundingWarning,
  type RevisionSource,
  type RunMode,
  type Snapshot,
} from "./contracts";
import { prompts, type PromptDefinition } from "./prompts";
import * as repo from "./repository";
import {
  documentFacts,
  groundingCheck,
  layoutCheck,
  isInterrupted,
  withUnitText,
  type DocumentFacts,
} from "./rules";

export type DocumentsDeps = BaseDeps;

export interface RunIdentity {
  applicationId: string;
  documentType: DocumentType;
  snapshot: Snapshot;
  mode: RunMode;
  provider: string;
  model: string;
}

/** The prompt for a document type, so callers and the paste-back column show the same text. */
export function promptFor(type: DocumentType): PromptDefinition {
  return prompts[type];
}

/**
 * Writes the run row first (docs/05). `running` for an adapter call, `queued` for paste-back and
 * the assistant, whose answers arrive later.
 */
export async function startRun(
  deps: DocumentsDeps,
  profileId: string,
  identity: RunIdentity,
): Promise<repo.GenerationRunRecord> {
  const prompt = prompts[identity.documentType];
  const at = now(deps);
  if (identity.mode !== "adapter") {
    await repo.cancelQueuedRuns(
      deps.db,
      profileId,
      identity.applicationId,
      identity.documentType,
      at,
    );
  }
  return repo.insertRun(deps.db, {
    id: newId(deps),
    profileId,
    applicationId: identity.applicationId,
    documentType: identity.documentType,
    state: identity.mode === "adapter" ? "running" : "queued",
    mode: identity.mode,
    provider: identity.provider,
    model: identity.model,
    promptName: prompt.name,
    promptVersion: prompt.version,
    snapshot: identity.snapshot,
    startedAt: identity.mode === "adapter" ? at : null,
    createdAt: at,
    updatedAt: at,
  });
}

/**
 * Records the adapter's answer: a validated revision with its grounding warnings on success, a
 * classified failure otherwise. A failure never touches an earlier revision.
 */
export async function finishRun(
  deps: DocumentsDeps,
  profileId: string,
  runId: string,
  outcome: GenerateOutcome<unknown>,
): Promise<
  Result<{ run: repo.GenerationRunRecord; revision: repo.DocumentRevisionRecord | null }>
> {
  const run = await repo.findRun(deps.db, profileId, runId);
  if (!run) return notFound("Generation run");
  const at = now(deps);
  if (!outcome.ok) {
    const failed = await repo.updateRun(deps.db, profileId, runId, {
      state: "failed",
      failureKind: outcome.kind,
      errorMessage: outcome.message,
      rawOutput: outcome.kind === "validation" ? outcome.rawText : null,
      ...usageColumns(outcome.usage),
      finishedAt: at,
      updatedAt: at,
    });
    return { ok: true, value: { run: failed!, revision: null } };
  }
  return saveRevision(deps, profileId, run, outcome.value, outcome.usage, "generated", at);
}

/**
 * Paste-back and the assistant: the submitted JSON goes through the same schema and grounding
 * check as an adapter answer. Invalid JSON is a field error and a failed run of kind
 * `pasted_invalid`; the revision's source follows the run's mode.
 */
export async function submitPastedAnswer(
  deps: DocumentsDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<{ run: repo.GenerationRunRecord; revision: repo.DocumentRevisionRecord }>> {
  const parsed = pasteBackInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const run = await repo.findRun(deps.db, profileId, parsed.data.runId);
  if (!run) return notFound("Generation run");
  if (run.mode === "adapter" || run.state !== "queued") {
    return validation({
      form: [
        run.mode === "assistant"
          ? "This brief was already answered; call get_document_brief again"
          : "This prompt was already answered; open Paste back again",
      ],
    });
  }
  const at = now(deps);
  let content: unknown;
  try {
    content = JSON.parse(stripFences(parsed.data.json));
  } catch {
    await failPasted(deps, profileId, run.id, "The pasted text is not JSON", parsed.data.json, at);
    return validation({ json: ["That is not valid JSON. Paste the whole answer, nothing else."] });
  }
  const schema = contentSchemas[run.documentType];
  const checked = schema.safeParse(content);
  if (!checked.success) {
    await failPasted(
      deps,
      profileId,
      run.id,
      "The pasted JSON does not match the schema",
      parsed.data.json,
      at,
    );
    const issues = checked.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "answer"}: ${i.message}`);
    return validation({
      json: [`The answer does not match the document shape: ${issues.join("; ")}`],
    });
  }
  const saved = await saveRevision(deps, profileId, run, checked.data, null, run.mode, at);
  if (!saved.ok) return saved;
  return { ok: true, value: { run: saved.value.run, revision: saved.value.revision! } };
}

/** Marks runs left `running` for longer than the limit as interrupted (docs/05). */
export async function sweepInterruptedRuns(
  deps: DocumentsDeps,
  profileId: string,
  limitMs = 10 * 60 * 1000,
): Promise<number> {
  const at = now(deps);
  return repo.failStaleRuns(deps.db, profileId, new Date(at.getTime() - limitMs), at);
}

export interface DocumentView {
  document: repo.DocumentRecord | null;
  revision: repo.DocumentRevisionRecord | null;
  latestRun: repo.GenerationRunRecord | null;
  warnings: GroundingWarning[];
}

export async function getDocumentView(
  deps: DocumentsDeps,
  profileId: string,
  applicationId: string,
  type: DocumentType,
): Promise<DocumentView> {
  const [document, runs] = await Promise.all([
    repo.findDocument(deps.db, profileId, applicationId, type),
    repo.listRuns(deps.db, profileId, applicationId, type),
  ]);
  const revision = document ? await repo.latestRevision(deps.db, profileId, document.id) : null;
  const latestRun = runs[0] ?? null;
  return { document, revision, latestRun, warnings: revision?.warnings ?? [] };
}

export async function listRunsForDocument(
  deps: DocumentsDeps,
  profileId: string,
  applicationId: string,
  type: DocumentType,
): Promise<repo.GenerationRunRecord[]> {
  const runs = await repo.listRuns(deps.db, profileId, applicationId, type);
  const at = now(deps);
  return runs.map((run) =>
    isInterrupted(run, at) ? { ...run, state: "failed", failureKind: "interrupted" } : run,
  );
}

export async function getRun(
  deps: DocumentsDeps,
  profileId: string,
  runId: string,
): Promise<repo.GenerationRunRecord | null> {
  return repo.findRun(deps.db, profileId, runId);
}

/** Inline editing: a new revision with one unit's text replaced, re-validated and re-checked. */
export async function editUnit(
  deps: DocumentsDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<repo.DocumentRevisionRecord>> {
  const parsed = editUnitInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  try {
    return await deps.db.transaction(async (tx) => {
      const current = await repo.findRevision(tx, profileId, input.expectedRevisionId);
      if (!current) return notFound("Revision");
      const latest = await repo.latestRevision(tx, profileId, current.documentId);
      if (!latest || latest.id !== current.id) return stale();
      const type = await documentType(tx, profileId, current.documentId);
      if (!type) return notFound("Document");
      const edited = withUnitText(type, current.content, input.path, input.text);
      if (!edited) return validation({ text: ["That part of the document no longer exists"] });
      const checked = contentSchemas[type].safeParse(edited);
      if (!checked.success) {
        const issue = checked.error.issues[0];
        return validation({ text: [issue ? issue.message : "The edit is not valid"] });
      }
      const snapshot = current.generationRunId
        ? (await repo.findRun(tx, profileId, current.generationRunId))?.snapshot
        : await snapshotForDocument(tx, profileId, current.documentId);
      const warnings = [
        ...(snapshot ? groundingCheck(type, checked.data, snapshot) : []),
        ...layoutCheck(type, checked.data),
      ];
      const at = now(deps);
      const created = await repo.insertRevision(tx, {
        id: newId(deps),
        profileId,
        documentId: current.documentId,
        generationRunId: current.generationRunId,
        content: checked.data,
        warnings,
        source: "edited",
        reviewedAt: null,
        createdAt: at,
      });
      return { ok: true as const, value: created };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

/** Reviewed means a person read it (docs/05); Ready on the application stays a manual choice. */
export async function markReviewed(
  deps: DocumentsDeps,
  profileId: string,
  revisionId: string,
  reviewed: boolean,
): Promise<Result<repo.DocumentRevisionRecord>> {
  const updated = await repo.setReviewedAt(
    deps.db,
    profileId,
    revisionId,
    reviewed ? now(deps) : null,
  );
  return updated ? { ok: true, value: updated } : notFound("Revision");
}

/** The facts the Jobs chip needs, per application id, in three queries for the whole list. */
export async function documentFactsForApplications(
  deps: DocumentsDeps,
  profileId: string,
  applicationIds: readonly string[],
): Promise<Map<string, DocumentFacts>> {
  const [runs, docs] = await Promise.all([
    repo.listRunsForApplications(deps.db, profileId, applicationIds),
    repo.listDocumentsForApplications(deps.db, profileId, applicationIds),
  ]);
  const revisions = await repo.listRevisionsForDocuments(
    deps.db,
    profileId,
    docs.map((d) => d.id),
  );
  const at = now(deps);
  const latestByDocument = new Map<string, repo.DocumentRevisionRecord>();
  for (const revision of revisions) {
    if (!latestByDocument.has(revision.documentId))
      latestByDocument.set(revision.documentId, revision);
  }
  const facts = new Map<string, DocumentFacts>();
  for (const applicationId of applicationIds) {
    const applicationRuns = runs
      .filter((r) => r.applicationId === applicationId)
      .map((r) => (isInterrupted(r, at) ? { ...r, state: "failed" as const } : r));
    const latestRevisions = docs
      .filter((d) => d.applicationId === applicationId)
      .map((d) => latestByDocument.get(d.id))
      .filter((r): r is repo.DocumentRevisionRecord => r !== undefined);
    facts.set(applicationId, documentFacts(applicationRuns, latestRevisions));
  }
  return facts;
}

// Helpers

async function saveRevision(
  deps: DocumentsDeps,
  profileId: string,
  run: repo.GenerationRunRecord,
  value: unknown,
  usage: GenerateUsage | null,
  source: Exclude<RevisionSource, "edited">,
  at: Date,
): Promise<
  Result<{ run: repo.GenerationRunRecord; revision: repo.DocumentRevisionRecord | null }>
> {
  const type = run.documentType;
  const checked = contentSchemas[type].safeParse(value);
  if (!checked.success) {
    const failed = await repo.updateRun(deps.db, profileId, run.id, {
      state: "failed",
      failureKind: "validation",
      errorMessage: "The answer did not match the document schema",
      rawOutput: JSON.stringify(value),
      ...usageColumns(usage),
      finishedAt: at,
      updatedAt: at,
    });
    return { ok: true, value: { run: failed!, revision: null } };
  }
  const content: DocumentContent = checked.data;
  const warnings = [...groundingCheck(type, content, run.snapshot), ...layoutCheck(type, content)];
  try {
    return await deps.db.transaction(async (tx) => {
      const document =
        (await repo.findDocument(tx, profileId, run.applicationId, type)) ??
        (await repo.insertDocument(tx, {
          id: newId(deps),
          profileId,
          applicationId: run.applicationId,
          type,
          createdAt: at,
          updatedAt: at,
        }));
      const revision = await repo.insertRevision(tx, {
        id: newId(deps),
        profileId,
        documentId: document.id,
        generationRunId: run.id,
        content,
        warnings,
        source,
        reviewedAt: null,
        createdAt: at,
      });
      const finished = await repo.updateRun(tx, profileId, run.id, {
        state: "succeeded",
        ...usageColumns(usage),
        finishedAt: at,
        updatedAt: at,
      });
      return { ok: true as const, value: { run: finished!, revision } };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}

async function failPasted(
  deps: DocumentsDeps,
  profileId: string,
  runId: string,
  message: string,
  raw: string,
  at: Date,
): Promise<void> {
  await repo.updateRun(deps.db, profileId, runId, {
    state: "failed",
    failureKind: "pasted_invalid",
    errorMessage: message,
    rawOutput: raw.slice(0, 20_000),
    finishedAt: at,
    updatedAt: at,
  });
}

function usageColumns(usage: GenerateUsage | null) {
  return {
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    costUsd: usage?.costUsd === null || usage?.costUsd === undefined ? null : String(usage.costUsd),
    latencyMs: usage?.latencyMs ?? null,
  };
}

/** Assistants wrap JSON in code fences; the user should not have to strip them. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return m ? m[1]! : trimmed;
}

async function documentType(
  db: DocumentsDeps["db"] | Parameters<typeof repo.findRevision>[0],
  profileId: string,
  documentId: string,
): Promise<DocumentType | null> {
  const rows = await repo.listDocumentsForApplicationsById(db, profileId, [documentId]);
  return rows[0]?.type ?? null;
}

async function snapshotForDocument(
  db: Parameters<typeof repo.findRevision>[0],
  profileId: string,
  documentId: string,
): Promise<Snapshot | undefined> {
  const revisions = await repo.listRevisions(db, profileId, documentId);
  const withRun = revisions.find((r) => r.generationRunId);
  if (!withRun?.generationRunId) return undefined;
  return (await repo.findRun(db, profileId, withRun.generationRunId))?.snapshot;
}
