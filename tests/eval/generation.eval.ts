/*
 * The synthetic evaluation set (ADR 006, docs/05): runs examples/generation/cases against the
 * provider configured in .env and reports grounding warnings, tokens, latency and cost. It runs
 * through vitest because that is the one runner here that handles TypeScript, path aliases and
 * ESM-only dependencies alike, but it is not a unit test: it spends real money and is excluded
 * from `pnpm test` and CI. `pnpm eval` runs it; a case fails when the provider rejected the call
 * or the answer failed schema validation, so a schema a provider cannot compile shows up here
 * rather than in someone's Runs column. Optional filter: EVAL_CASES=fit,mismatch.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { z } from "zod";
import { loadConfig, modelConfig } from "@/infrastructure/config";
import { createModelAdapter, type ModelAdapter } from "@/infrastructure/model";
import {
  contentSchemas,
  documentTypes,
  groundingCheck,
  prompts,
  type DocumentContent,
  type Snapshot,
  type CoverLetterContent,
} from "@/modules/documents";

import { renderCoverLetterPdf, letterHeaderFrom, pdfPageCount } from "@/modules/documents/pdf";

const casesDir = path.join("examples", "generation", "cases");

async function loadEnvFile(): Promise<void> {
  try {
    const text = await readFile(".env", "utf8");
    for (const line of text.split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!;
    }
  } catch {
    /* no .env: rely on the environment */
  }
}

type Row = Record<string, string | number | null>;

function snapshotFromCase(
  profile: Record<string, unknown[]>,
  job: Record<string, unknown>,
): Snapshot {
  const p = (profile.profiles as Record<string, unknown>[])[0]!;
  const nullable = (v: unknown) => (v === undefined ? null : (v as never));
  return {
    capturedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      id: String(p.id),
      displayName: String(p.display_name),
      headline: nullable(p.headline),
      summary: nullable(p.summary),
      email: nullable(p.email),
      phone: nullable(p.phone),
      location: nullable(p.location),
      links: [],
    },
    employment: (profile.employment as Record<string, unknown>[]).map((e) => ({
      id: String(e.id),
      employerName: String(e.employer_name),
      role: String(e.role),
      location: nullable(e.location),
      startYear: nullable(e.start_year),
      startMonth: nullable(e.start_month),
      endYear: nullable(e.end_year),
      endMonth: nullable(e.end_month),
      isCurrent: Boolean(e.is_current),
      description: nullable(e.description),
    })),
    education: (profile.education as Record<string, unknown>[]).map((e) => ({
      id: String(e.id),
      institution: String(e.institution),
      qualification: nullable(e.qualification),
      subject: nullable(e.subject),
      startYear: nullable(e.start_year),
      startMonth: nullable(e.start_month),
      endYear: nullable(e.end_year),
      endMonth: nullable(e.end_month),
      status: String(e.status),
      description: nullable(e.description),
    })),
    projects: (profile.projects as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      employmentId: nullable(r.employment_id),
      name: String(r.name),
      description: nullable(r.description),
      url: nullable(r.url),
      startYear: nullable(r.start_year),
      startMonth: nullable(r.start_month),
      endYear: nullable(r.end_year),
      endMonth: nullable(r.end_month),
    })),
    skills: (profile.skills as Record<string, unknown>[]).map((s) => ({
      id: String(s.id),
      displayName: String(s.display_name),
      category: nullable(s.category),
    })),
    achievements: (profile.achievements as Record<string, unknown>[]).map((a) => ({
      id: String(a.id),
      employmentId: nullable(a.employment_id),
      projectId: nullable(a.project_id),
      statement: String(a.statement),
      problem: nullable(a.problem),
      action: nullable(a.action),
      result: nullable(a.result),
      metric: nullable(a.metric),
      skillIds: (profile.achievement_skills as Record<string, unknown>[])
        .filter((l) => l.achievement_id === a.id)
        .map((l) => String(l.skill_id)),
    })),
    job: {
      id: "eval",
      title: String(job.title),
      companyName: String(job.company_name),
      location: nullable(job.location),
      rawDescription: String(job.raw_description),
    },
  };
}

const rows: Row[] = [];
const letters: Record<string, unknown> = {};
let adapter: ModelAdapter | null = null;
let totalCost = 0;
let costKnown = true;

beforeAll(async () => {
  await loadEnvFile();
  const config = modelConfig(loadConfig());
  adapter = createModelAdapter(config);
  if (!adapter || config.kind === "fake") {
    throw new Error(
      "Configure LANDED_MODEL_PROVIDER, LANDED_MODEL and LANDED_MODEL_API_KEY in .env with a real provider first.",
    );
  }
});

afterAll(async () => {
  if (!adapter) return;
  console.log(`Provider ${adapter.provider}, model ${adapter.model}`);
  console.table(rows);
  if (process.env.EVAL_REPORT_PATH)
    await writeFile(
      process.env.EVAL_REPORT_PATH,
      JSON.stringify({ provider: adapter.provider, model: adapter.model, rows, letters }, null, 2),
    );
  console.log(
    costKnown
      ? `Total cost reported: $${totalCost.toFixed(4)}`
      : "Cost not reported by this provider",
  );
});

const wanted = (process.env.EVAL_CASES ?? "").split(",").filter(Boolean);
const caseNames = (await readdir(casesDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && (wanted.length === 0 || wanted.includes(d.name)))
  .map((d) => d.name);

describe.each(caseNames)("case %s", (name) => {
  it.each(documentTypes)(
    "%s answers the schema",
    async (type) => {
      const profile = JSON.parse(await readFile(path.join(casesDir, name, "profile.json"), "utf8"));
      const job = JSON.parse(await readFile(path.join(casesDir, name, "job.json"), "utf8"));
      const snapshot = snapshotFromCase(profile, job);
      if (type === "cover_letter") {
        try {
          snapshot.writingContext = JSON.parse(
            await readFile(path.join(casesDir, name, "writing-context.json"), "utf8"),
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      const prompt = prompts[type];
      const outcome = await adapter!.generate({
        promptName: prompt.name,
        promptVersion: prompt.version,
        instructions: prompt.instructions,
        input: prompt.buildInput(snapshot),
        schema: contentSchemas[type] as z.ZodType<DocumentContent>,
      });
      if (!outcome.ok) {
        if (process.env.EVAL_REPORT_PATH)
          letters[`${name}/${type}/failure`] = { rawText: outcome.rawText };
        rows.push({ case: name, document: type, outcome: `${outcome.kind}: ${outcome.message}` });
        expect.fail(`${name}/${type}: ${outcome.kind} failure, ${outcome.message}`);
      }
      if (type === "cover_letter") {
        const pdf = await renderCoverLetterPdf(
          outcome.value as CoverLetterContent,
          letterHeaderFrom(snapshot, new Date(snapshot.capturedAt)),
        );
        expect(pdfPageCount(pdf)).toBe(1);
        letters[name] = { content: outcome.value, snapshot, pdfPages: pdfPageCount(pdf) };
        if (process.env.EVAL_REPORT_PATH)
          await writeFile(
            path.join(path.dirname(process.env.EVAL_REPORT_PATH), `landed-eval-${name}.pdf`),
            pdf,
          );
      }
      const warnings = groundingCheck(type, outcome.value, snapshot);
      const byKind: Record<string, number> = {};
      for (const w of warnings) byKind[w.kind] = (byKind[w.kind] ?? 0) + 1;
      if (outcome.usage.costUsd === null) costKnown = false;
      else totalCost += outcome.usage.costUsd;
      rows.push({
        case: name,
        document: type,
        outcome: "ok",
        warnings:
          Object.entries(byKind)
            .map(([k, n]) => `${k}=${n}`)
            .join(" ") || "none",
        inputTokens: outcome.usage.inputTokens,
        outputTokens: outcome.usage.outputTokens,
        ...(type === "cover_letter"
          ? {
              bodyWords: (outcome.value as CoverLetterContent).paragraphs
                .map((p) => p.text)
                .join(" ")
                .trim()
                .split(/\s+/).length,
            }
          : {}),
        latencyMs: outcome.usage.latencyMs,
        costUsd: outcome.usage.costUsd,
      });
    },
    180_000,
  );
});
