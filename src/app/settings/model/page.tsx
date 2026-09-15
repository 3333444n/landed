import { Settings } from "lucide-react";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { getModelStatus } from "@/infrastructure/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * One recipe per provider: the exact lines to put in the environment file. The values shown are
 * examples; the model name is whatever the provider spells it as on its own model page.
 */
const recipes: { title: string; note: string; lines: string[] }[] = [
  {
    title: "OpenRouter",
    note: "One key for models from many companies. The model name is the slug shown on the model's OpenRouter page, for example google/gemini-3.1-flash-lite or anthropic/claude-sonnet-5. Get a key at openrouter.ai/settings/keys.",
    lines: [
      "LANDED_MODEL_PROVIDER=openrouter",
      "LANDED_MODEL=google/gemini-3.1-flash-lite",
      "LANDED_MODEL_API_KEY=sk-or-…",
    ],
  },
  {
    title: "Anthropic",
    note: "A key from console.anthropic.com.",
    lines: [
      "LANDED_MODEL_PROVIDER=anthropic",
      "LANDED_MODEL=claude-sonnet-5",
      "LANDED_MODEL_API_KEY=sk-ant-…",
    ],
  },
  {
    title: "OpenAI",
    note: "A key from platform.openai.com.",
    lines: ["LANDED_MODEL_PROVIDER=openai", "LANDED_MODEL=gpt-5", "LANDED_MODEL_API_KEY=sk-…"],
  },
  {
    title: "Vercel AI Gateway",
    note: "One key for many models, addressed as company/model.",
    lines: [
      "LANDED_MODEL_PROVIDER=gateway",
      "LANDED_MODEL=anthropic/claude-sonnet-5",
      "LANDED_MODEL_API_KEY=vck_…",
    ],
  },
  {
    title: "Ollama or another OpenAI-compatible server",
    note: "Any endpoint that speaks the OpenAI chat API. Needs the base URL; the key is optional for a local server. From the packaged installation, a server on this computer is host.docker.internal, not localhost.",
    lines: [
      "LANDED_MODEL_PROVIDER=openai_compatible",
      "LANDED_MODEL=llama3.1",
      "LANDED_MODEL_BASE_URL=http://localhost:11434/v1",
    ],
  },
];

/** Reads the environment and shows what is configured (ADR 006). The key is never rendered. */
export default function ModelSetupPage() {
  const status = getModelStatus();
  return (
    <Column
      icon={<Settings />}
      title="Model setup"
      subtitle="Where generated documents come from."
      width="detail"
    >
      {status.kind === "unconfigured" ? (
        <>
          <Card title="No model configured">
            <p className={styles.text}>
              Paste back works without one: every document can show you its prompt, you run it in
              any assistant and paste the answer back. To let Landed call a provider itself, add one
              of the blocks below to your .env file (.env.release for the packaged installation),
              then restart. The key stays in that file: it is never stored, shown or logged.
            </p>
          </Card>
          {recipes.map((recipe) => (
            <Card key={recipe.title} title={recipe.title}>
              <p className={`${styles.text} text-secondary`}>{recipe.note}</p>
              <ul className={styles.lines}>
                {recipe.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Card>
          ))}
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
