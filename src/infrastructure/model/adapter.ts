/*
 * The one interface every model access path implements (ADR 006): a structured-output request
 * with a Zod schema in, a validated value with usage or a classified failure out. Documents never
 * see which provider answered.
 */
import type { z } from "zod";

export interface GenerateRequest<T> {
  /** Identifies the prompt for the run record; versions change when the text changes. */
  promptName: string;
  promptVersion: number;
  /** Trusted instructions. Never contains user-pasted text. */
  instructions: string;
  /** The input the model works on; untrusted text lives here inside labelled data blocks. */
  input: string;
  schema: z.ZodType<T>;
}

export interface GenerateUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  /** In USD, only when the provider reports it; never estimated. */
  costUsd: number | null;
  latencyMs: number;
}

export type GenerateOutcome<T> =
  | { ok: true; value: T; usage: GenerateUsage }
  | {
      ok: false;
      /** provider: the call failed; validation: the answer did not match the schema. */
      kind: "provider" | "validation";
      /** An error class or status, never career content and never the key. */
      message: string;
      usage: GenerateUsage | null;
      /** The raw answer on a validation failure, kept on the run for inspection. */
      rawText: string | null;
    };

export interface ModelAdapter {
  readonly provider: string;
  readonly model: string;
  generate<T>(request: GenerateRequest<T>): Promise<GenerateOutcome<T>>;
}
