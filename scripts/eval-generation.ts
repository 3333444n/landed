/*
 * Runs the synthetic evaluation cases in examples/generation/cases against the provider
 * configured in .env (ADR 006). Never part of CI: it spends real money. Prints one line per case
 * and document with the grounding warnings by kind, tokens, latency and cost when reported, and
 * exits non-zero only when an answer failed schema validation.
 *
 * Usage: pnpm eval [case ...]   (cases default to every folder under examples/generation/cases)
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { loadConfig, modelConfig } from "@/infrastructure/config";
import { createModelAdapter } from "@/infrastructure/model";
import {
  contentSchemas,
  groundingCheck,
  documentTypes,
  prompts,
  type DocumentContent,
  type Snapshot,
} from "@/modules/documents";
import type { z } from "zod";

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

async function main() {
  await loadEnvFile();
  const config = modelConfig(loadConfig());
  const adapter = createModelAdapter(config);
  if (!adapter || config.kind === "fake") {
    console.error(
      "Configure LANDED_MODEL_PROVIDER, LANDED_MODEL and LANDED_MODEL_API_KEY in .env with a real provider first.",
    );
    process.exit(2);
  }
  const wanted = process.argv.slice(2);
  const names = (await readdir(casesDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && (wanted.length === 0 || wanted.includes(d.name)))
    .map((d) => d.name);
  const rows: Row[] = [];
  let schemaFailures = 0;
  let totalCost = 0;
  let costKnown = true;
  for (const name of names) {
    const profile = JSON.parse(await readFile(path.join(casesDir, name, "profile.json"), "utf8"));
    const job = JSON.parse(await readFile(path.join(casesDir, name, "job.json"), "utf8"));
    const snapshot = snapshotFromCase(profile, job);
    for (const type of documentTypes) {
      const prompt = prompts[type];
      const outcome = await adapter.generate({
        promptName: prompt.name,
        promptVersion: prompt.version,
        instructions: prompt.instructions,
        input: prompt.buildInput(snapshot),
        schema: contentSchemas[type] as z.ZodType<DocumentContent>,
      });
      if (!outcome.ok) {
        if (outcome.kind === "validation") schemaFailures += 1;
        rows.push({ case: name, document: type, outcome: `${outcome.kind}: ${outcome.message}` });
        continue;
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
        latencyMs: outcome.usage.latencyMs,
        costUsd: outcome.usage.costUsd,
      });
    }
  }
  console.log(`Provider ${adapter.provider}, model ${adapter.model}`);
  console.table(rows);
  console.log(
    costKnown
      ? `Total cost reported: $${totalCost.toFixed(4)}`
      : "Cost not reported by this provider",
  );
  process.exit(schemaFailures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exit(1);
});
