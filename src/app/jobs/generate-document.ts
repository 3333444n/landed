/*
 * Composition boundary (docs/03) for Phase 1b: reads the profile, the job and its application
 * through their public surfaces, freezes the snapshot, and hands it with the adapter's answer
 * to Documents. The run row is committed before the model call and no transaction spans it
 * (docs/05). Documents never imports Profile, Jobs or Applications.
 */
import type { z } from "zod";
import type { ModelAdapter } from "@/infrastructure/model";
import { getApplicationForJob } from "@/modules/applications";
import {
  contentSchemas,
  finishRun,
  type DocumentContent,
  promptFor,
  startRun,
  type DocumentType,
  type GenerationRunRecord,
  type Snapshot,
} from "@/modules/documents";
import { getJob } from "@/modules/jobs";
import {
  listAchievements,
  listEducation,
  listEmployment,
  listProjects,
  listSkills,
  getCurrentProfile,
} from "@/modules/profile";
import type { Result } from "@/modules/shared/contracts";
import { notFound, now, type BaseDeps } from "@/modules/shared/service";
import { buildSnapshot } from "./snapshot";

export interface GenerationTarget {
  applicationId: string;
  snapshot: Snapshot;
}

/** Everything one generation needs, frozen at this moment. */
export async function prepareGeneration(
  deps: BaseDeps,
  profileId: string,
  jobId: string,
): Promise<Result<GenerationTarget>> {
  const [profile, job, application] = await Promise.all([
    getCurrentProfile(deps),
    getJob(deps, profileId, jobId),
    getApplicationForJob(deps, profileId, jobId),
  ]);
  if (!profile || profile.id !== profileId) return notFound("Profile");
  if (!job) return notFound("Job");
  if (!application) return notFound("Application");
  const [employment, education, projects, skills, achievements] = await Promise.all([
    listEmployment(deps, profileId),
    listEducation(deps, profileId),
    listProjects(deps, profileId),
    listSkills(deps, profileId),
    listAchievements(deps, profileId),
  ]);
  const snapshot = buildSnapshot({
    profile,
    employment,
    education,
    projects,
    skills,
    achievements,
    job,
    capturedAt: now(deps),
  });
  return { ok: true, value: { applicationId: application.id, snapshot } };
}

/** Generate through the configured adapter: start the run, call, finish the run. */
export async function generateDocument(
  deps: BaseDeps,
  adapter: ModelAdapter,
  profileId: string,
  jobId: string,
  type: DocumentType,
): Promise<Result<GenerationRunRecord>> {
  const prepared = await prepareGeneration(deps, profileId, jobId);
  if (!prepared.ok) return prepared;
  const { applicationId, snapshot } = prepared.value;
  const prompt = promptFor(type);
  const run = await startRun(deps, profileId, {
    applicationId,
    documentType: type,
    snapshot,
    mode: "adapter",
    provider: adapter.provider,
    model: adapter.model,
  });
  // Outside any transaction: the row above is already committed as `running`.
  const outcome = await adapter.generate({
    promptName: prompt.name,
    promptVersion: prompt.version,
    instructions: prompt.instructions,
    input: prompt.buildInput(snapshot),
    schema: contentSchemas[type] as z.ZodType<DocumentContent>,
  });
  const finished = await finishRun(deps, profileId, run.id, outcome);
  if (!finished.ok) return finished;
  return { ok: true, value: finished.value.run };
}

/** Paste-back: freeze the snapshot and open a queued run; the user supplies the answer later. */
export async function preparePasteBack(
  deps: BaseDeps,
  profileId: string,
  jobId: string,
  type: DocumentType,
): Promise<Result<{ run: GenerationRunRecord; instructions: string; input: string }>> {
  const prepared = await prepareGeneration(deps, profileId, jobId);
  if (!prepared.ok) return prepared;
  const { applicationId, snapshot } = prepared.value;
  const prompt = promptFor(type);
  const run = await startRun(deps, profileId, {
    applicationId,
    documentType: type,
    snapshot,
    mode: "pasted",
    provider: "pasted",
    model: "user",
  });
  return {
    ok: true,
    value: { run, instructions: prompt.instructions, input: prompt.buildInput(snapshot) },
  };
}
