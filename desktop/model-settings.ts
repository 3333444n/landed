/*
 * The desktop model setting (ADR 006, revised by ADR 013): provider, model and base URL in
 * userData/model.json, the key encrypted with safeStorage, which uses the OS keychain. Main hands
 * them to the server as the LANDED_MODEL_* variables, so the server reads them as it would read
 * an environment file.
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { safeStorage } from "electron";
import { z } from "zod";
import { loadConfig, modelConfig, modelProviders } from "../src/infrastructure/config";

export const modelInput = z.strictObject({
  provider: z.enum(modelProviders),
  model: z.string().max(200),
  baseUrl: z.string().max(2000),
  /** Blank keeps the saved key: the window never receives it, so it cannot send it back. */
  key: z.string().max(4000),
});

type Settings = { provider: string; model: string; baseUrl: string; key: string };

/** The server's variables for these settings; a blank one counts as unset. */
export function modelEnv(settings: Settings) {
  return {
    LANDED_MODEL_PROVIDER: settings.provider,
    LANDED_MODEL: settings.model,
    LANDED_MODEL_BASE_URL: settings.baseUrl,
    LANDED_MODEL_API_KEY: settings.key,
  };
}

/** What the server would reject in these variables, in its own words, or null. */
export function modelProblem(env: ReturnType<typeof modelEnv>): string | null {
  try {
    // Cast: Next's ambient types make NODE_ENV a required property of ProcessEnv.
    const config = modelConfig(loadConfig(env as unknown as NodeJS.ProcessEnv));
    return config.kind === "invalid" ? config.problems.join("; ") : null;
  } catch (error) {
    return (error as Error).message;
  }
}

const settingsPath = (userData: string) => join(userData, "model.json");

export function loadModelEnv(userData: string): Partial<ReturnType<typeof modelEnv>> {
  let saved: Settings;
  try {
    saved = JSON.parse(readFileSync(settingsPath(userData), "utf8"));
  } catch {
    return {};
  }
  const key = saved.key ? safeStorage.decryptString(Buffer.from(saved.key, "base64")) : "";
  return modelEnv({ ...saved, key });
}

/** Saves the settings and returns null, or returns why they were not saved. */
export function saveModelSettings(userData: string, payload: unknown): string | null {
  const parsed = modelInput.safeParse(payload);
  if (!parsed.success) return "These settings are not valid.";
  const { key, ...rest } = parsed.data;
  const plainKey = key.trim() || loadModelEnv(userData).LANDED_MODEL_API_KEY || "";
  const problem = modelProblem(modelEnv({ ...rest, key: plainKey }));
  if (problem) return problem;
  if (
    plainKey &&
    (!safeStorage.isEncryptionAvailable() ||
      (process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text"))
  ) {
    return "This computer has no keychain Landed can use, so the key cannot be stored safely.";
  }
  const saved: Settings = {
    ...rest,
    key: plainKey ? safeStorage.encryptString(plainKey).toString("base64") : "",
  };
  writeFileSync(settingsPath(userData), JSON.stringify(saved), { mode: 0o600 });
  return null;
}

export function clearModelSettings(userData: string) {
  rmSync(settingsPath(userData), { force: true });
}
