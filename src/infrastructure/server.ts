/*
 * Process-wide resources for the Next.js server: the database pool, the model adapter and the
 * assistant endpoint's configuration.
 * Created lazily on first use and reused across requests; in development the module is
 * re-evaluated on hot reload, so both are cached on globalThis to avoid leaking pools.
 */
import {
  assistantConfig,
  describeModelConfig,
  loadConfig,
  modelConfig,
  type AssistantConfig,
  type ModelStatus,
} from "./config";
import { createDatabase, type DatabaseConnection } from "./database";
import { createModelAdapter, type ModelAdapter } from "./model";

const globalRef = globalThis as typeof globalThis & {
  __landedDatabase?: DatabaseConnection;
  __landedModel?: { adapter: ModelAdapter | null; status: ModelStatus };
  __landedAssistant?: AssistantConfig;
};

export function getDatabase(): DatabaseConnection {
  if (!globalRef.__landedDatabase) {
    globalRef.__landedDatabase = createDatabase(loadConfig().DATABASE_URL);
  }
  return globalRef.__landedDatabase;
}

/** The configured adapter, or null when paste-back is the only path (ADR 006). */
export function getModelAdapter(): ModelAdapter | null {
  return modelResources().adapter;
}

/** What the Model setup column shows. Never carries the key. */
export function getModelStatus(): ModelStatus {
  return modelResources().status;
}

/** The assistant endpoint's token, read on first use so tests can set the environment first. */
export function getAssistantConfig(): AssistantConfig {
  if (!globalRef.__landedAssistant) {
    globalRef.__landedAssistant = assistantConfig(loadConfig());
  }
  return globalRef.__landedAssistant;
}

function modelResources() {
  if (!globalRef.__landedModel) {
    const config = modelConfig(loadConfig());
    globalRef.__landedModel = {
      adapter: createModelAdapter(config),
      status: describeModelConfig(config),
    };
  }
  return globalRef.__landedModel;
}
