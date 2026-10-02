"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import styles from "@/components/forms.module.css";
import { modelProviders, type ModelStatus } from "@/infrastructure/config";
import pageStyles from "./page.module.css";

/**
 * The desktop app's model setting (ADR 006 revision). Main validates and stores it, keeps the key
 * in the OS keychain and restarts the server, which reloads this window; the key never comes back.
 */
export function ModelForm({ status }: { status: ModelStatus }) {
  const configured = status.kind === "configured" ? status : null;
  const [provider, setProvider] = useState<string>(
    status.kind === "fake" ? "fake" : (configured?.provider ?? "openrouter"),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(task: Promise<string | null>) {
    setPending(true);
    const problem = await task;
    setError(problem);
    setPending(false);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(
      window.landed.saveModel({
        provider,
        model: String(data.get("model") ?? ""),
        baseUrl: String(data.get("baseUrl") ?? ""),
        key: String(data.get("key") ?? ""),
      }),
    );
  }

  return (
    <form onSubmit={save} className={styles.form} noValidate>
      <Select
        label="Provider"
        name="provider"
        value={provider}
        onChange={(event) => setProvider(event.target.value)}
        options={modelProviders.map((value) => ({ value, label: value }))}
      />
      {provider !== "fake" ? (
        <>
          <Field
            label="Model"
            name="model"
            defaultValue={configured?.model}
            helper="As the provider spells it, for example google/gemini-3.1-flash-lite on OpenRouter."
          />
          {provider === "openrouter" || provider === "openai_compatible" ? (
            <Field
              label="Base URL"
              name="baseUrl"
              defaultValue={configured?.baseUrl ?? ""}
              helper={
                provider === "openrouter"
                  ? "Optional."
                  : "For example http://localhost:11434/v1 for Ollama."
              }
            />
          ) : null}
          <Field
            label="Key"
            name="key"
            type="password"
            autoComplete="off"
            helper={
              configured?.keyHint
                ? `Ends in ••••${configured.keyHint}. Leave blank to keep it. It is kept in this computer's keychain.`
                : "Kept in this computer's keychain, never shown again."
            }
          />
        </>
      ) : null}
      <p className="text-secondary">
        Paste back works without a model. With one, your career facts and the pasted posting are
        sent to the provider when you generate.
      </p>
      {error ? (
        <p className={`${styles.status} ${styles.failed}`} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        {status.kind !== "unconfigured" ? (
          <Button
            variant="secondary"
            className={pageStyles.danger}
            disabled={pending}
            onClick={() => void run(window.landed.clearModel())}
          >
            Remove
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}
