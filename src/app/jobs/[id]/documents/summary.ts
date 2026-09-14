/*
 * Presentation helpers for generated materials: what a document card and the review column say
 * about the latest run and revision. Server-safe and browser-safe: plain data in, strings out.
 */
import type { ChipTone } from "@/modules/applications/contracts";
import {
  failureLabels,
  type DocumentView,
  type GenerationRunRecord,
  type Snapshot,
} from "@/modules/documents";

export function formatTokens(run: GenerationRunRecord): string | null {
  if (run.inputTokens === null && run.outputTokens === null) return null;
  const total = (run.inputTokens ?? 0) + (run.outputTokens ?? 0);
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k tokens` : `${total} tokens`;
}

export function formatCost(costUsd: string | null): string | null {
  if (costUsd === null) return null;
  return `$${Number(costUsd).toFixed(4)}`;
}

/** One short line under the card title. */
export function runSummary(view: DocumentView): string {
  const run = view.latestRun;
  if (!run && !view.revision) return "Not started";
  if (!run) return "Edited by hand";
  if (run.state === "failed") {
    return `Failed: ${run.failureKind ? failureLabels[run.failureKind] : "unknown error"}`;
  }
  if (run.state === "queued" && run.mode === "pasted") return "Paste back opened, no answer yet";
  if (run.state === "queued" || run.state === "running") return "Crafting";
  if (run.mode === "pasted") return "Pasted back";
  return ["Generated", formatTokens(run), formatCost(run.costUsd)].filter(Boolean).join(" · ");
}

export function documentChip(view: DocumentView): { label: string; tone: ChipTone } | null {
  const run = view.latestRun;
  if (run && run.state === "running" && !view.revision) {
    return { label: "Crafting", tone: "accent" };
  }
  if (run?.state === "failed") return { label: "Generation failed", tone: "warning" };
  if (view.revision) {
    return view.revision.reviewedAt
      ? { label: "Reviewed", tone: "success" }
      : { label: "Needs review", tone: "warning" };
  }
  return null;
}

/** Short labels for evidence ids, shown under each unit and in the Evidence column. */
export function evidenceLabels(snapshot: Snapshot): Record<string, string> {
  const labels: Record<string, string> = {};
  labels[snapshot.profile.id] = snapshot.profile.displayName;
  for (const e of snapshot.employment) labels[e.id] = `${e.role} at ${e.employerName}`;
  for (const p of snapshot.projects) labels[p.id] = p.name;
  for (const e of snapshot.education) labels[e.id] = e.institution;
  for (const s of snapshot.skills) labels[s.id] = s.displayName;
  for (const a of snapshot.achievements) labels[a.id] = a.statement;
  return labels;
}
