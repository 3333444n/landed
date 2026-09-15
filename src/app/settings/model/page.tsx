import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { getModelStatus } from "@/infrastructure/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const providerLines = [
  "LANDED_MODEL_PROVIDER: anthropic, openai, gateway (Vercel AI Gateway) or openai_compatible (OpenRouter, Ollama, Groq, LM Studio)",
  "LANDED_MODEL: the model name as the provider spells it, for example claude-opus-5 or anthropic/claude-opus-5 through the gateway",
  "LANDED_MODEL_API_KEY: the provider's key; it stays in that file and is never stored or logged",
  "LANDED_MODEL_BASE_URL: only for openai_compatible, for example https://openrouter.ai/api/v1 or http://localhost:11434/v1",
];

/** Reads the environment and shows what is configured (ADR 006). The key is never rendered. */
export default function ModelSetupPage() {
  const status = getModelStatus();
  return (
    <Column title="Model setup" subtitle="Where generated documents come from." width="detail">
      {status.kind === "unconfigured" ? (
        <>
          <Card title="No model configured">
            <p className={styles.text}>
              Paste back works without one: every document can show you its prompt, you run it in
              any assistant and paste the answer back. To let Landed call a provider itself, add
              these lines to your .env file (.env.release for the packaged installation) and
              restart.
            </p>
          </Card>
          <Card title="Lines to add">
            <ul className={styles.lines}>
              {providerLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
      {status.kind === "invalid" ? (
        <Card title="Configuration incomplete">
          <ul className={styles.lines}>
            {status.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      {status.kind === "fake" ? (
        <Card title="Test double">
          <p className={styles.text}>
            Test double: answers come from examples/generation. Nothing is sent anywhere.
          </p>
        </Card>
      ) : null}
      {status.kind === "configured" ? (
        <Card title="Configured">
          <ul className={styles.lines}>
            <li>Provider: {status.provider}</li>
            <li>Model: {status.model}</li>
            <li>{status.keyHint ? `Key ends in ····${status.keyHint}` : "No key"}</li>
            {status.baseUrl ? <li>Base URL: {status.baseUrl}</li> : null}
          </ul>
          <p className={`${styles.text} text-secondary`}>
            Your career facts and the pasted posting are sent to this provider when you generate.
          </p>
        </Card>
      ) : null}
    </Column>
  );
}
