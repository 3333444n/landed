import { Plug } from "lucide-react";
import { headers } from "next/headers";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { CopyButton } from "@/components/CopyButton";
import { Field } from "@/components/Field";
import { getAssistantConfig } from "@/infrastructure/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * The port the browser used, so the block names the same installation. The hostname is always
 * 127.0.0.1: that is what the host guard accepts and what the packaged installation publishes,
 * even when the person opened the app as localhost.
 */
function endpointUrl(host: string | null): string {
  const port = host?.match(/:(\d+)$/)?.[1];
  return `http://127.0.0.1${port ? `:${port}` : ""}/mcp`;
}

/** One block per assistant, in the order they were tried; each is copied whole. */
function blocks(url: string, token: string): { title: string; note: string; text: string }[] {
  return [
    {
      title: "Claude Code",
      note: "Run this once in a terminal. It registers Landed for every project on this computer.",
      text: `claude mcp add --transport http --scope user landed ${url} --header "Authorization: Bearer ${token}"`,
    },
    {
      title: "Codex",
      note: "Run these two lines in a terminal. Codex reads the token from that variable each time it starts, so add the first line to your shell profile as well.",
      text: `export LANDED_MCP_TOKEN=${token}\ncodex mcp add landed --url ${url} --bearer-token-env-var LANDED_MCP_TOKEN`,
    },
    {
      title: "Claude Desktop",
      note: "Add this to claude_desktop_config.json (Settings, Developer, Edit config), then restart Claude Desktop. It goes through the mcp-remote bridge, which needs Node on this computer.",
      text: JSON.stringify(
        {
          mcpServers: {
            landed: {
              command: "npx",
              args: ["mcp-remote", url, "--header", "Authorization:${AUTH_HEADER}"],
              env: { AUTH_HEADER: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      ),
    },
    {
      title: "Teach it the workflow",
      note: "Optional. The connection above gives your assistant Landed's tools; the workflow tells it the order to use them in, the fit check before drafting and the rules for a draft. Claude Code installs it as a plugin (it asks for the address and the token from the block above); Codex finds it by itself when run inside the Landed checkout, or link it into your user skills with the last line.",
      text: `claude plugin marketplace add 3333444n/landed\nclaude plugin install landed@landed\nmkdir -p ~/.agents/skills && ln -s "$PWD/.agents/skills/landed" ~/.agents/skills/landed`,
    },
  ];
}

/**
 * Connect your assistant (ADR 008): the copyable registration block for each assistant, with the
 * token from the environment file filled in. This is the one place the token is shown; the hub
 * card shows only its last characters.
 */
export default async function AssistantSetupPage() {
  const assistant = getAssistantConfig();
  const url = endpointUrl((await headers()).get("host"));
  return (
    <Column
      icon={<Plug />}
      title="Connect your assistant"
      subtitle="Use the assistant you already pay for."
      parentHref="/settings"
      parentTitle="Settings"
      width="detail"
    >
      <p className="text-secondary">
        Your assistant reads your jobs and your facts through Landed at {url} and hands its drafts
        back through the same checks as a generated or pasted document. Only this computer can reach
        that address.
      </p>
      {assistant.kind === "unconfigured" ? (
        <Card title="Not configured">
          <p className={styles.text}>
            Add a line LANDED_MCP_TOKEN= followed by any long random string (at least 24 characters)
            to your .env file, then restart. The packaged installation generates the line on first
            start: if your .env.release predates it, run start again and the launcher appends one.
            The token stays in that file and is shown only here.
          </p>
        </Card>
      ) : (
        blocks(url, assistant.token).map((block) => (
          <Card key={block.title} title={block.title}>
            <p className={`${styles.text} text-secondary`}>{block.note}</p>
            <div className={styles.block}>
              <Field
                label={`Block for ${block.title}`}
                name={block.title.toLowerCase().replace(/\s+/g, "-")}
                multiline
                mono
                readOnly
                rows={2}
                defaultValue={block.text}
              />
            </div>
            <div className={styles.actions}>
              <CopyButton text={block.text} label="Copy" />
            </div>
          </Card>
        ))
      )}
    </Column>
  );
}
