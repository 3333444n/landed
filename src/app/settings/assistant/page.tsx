import { Plug } from "lucide-react";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { CopyButton } from "@/components/CopyButton";
import { Field } from "@/components/Field";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * The command an assistant runs to start Landed over stdio (ADR 013): the desktop app passes its
 * own executable; a checkout runs `pnpm mcp` from the repository folder.
 */
function launchCommand(): { command: string; args: string[] } {
  const executable = process.env.LANDED_EXECUTABLE_PATH;
  if (executable) return { command: executable, args: ["--mcp"] };
  return { command: "pnpm", args: ["--silent", "--dir", process.cwd(), "mcp"] };
}

const quoted = (parts: string[]) =>
  parts.map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(" ");

/** One block per assistant, in the order they were tried; each is copied whole. */
function blocks(): { title: string; note: string; text: string }[] {
  const { command, args } = launchCommand();
  const line = quoted([command, ...args]);
  return [
    {
      title: "Claude Code",
      note: "Run this once in a terminal. It registers Landed for every project on this computer.",
      text: `claude mcp add --scope user landed -- ${line}`,
    },
    {
      title: "Codex",
      note: "Run this once in a terminal.",
      text: `codex mcp add landed -- ${line}`,
    },
    {
      title: "Claude Desktop",
      note: "Add this to claude_desktop_config.json (Settings, Developer, Edit config), then restart Claude Desktop.",
      text: JSON.stringify({ mcpServers: { landed: { command, args } } }, null, 2),
    },
    {
      title: "Teach it the workflow",
      note: "Optional. The connection above gives your assistant Landed's tools; the workflow tells it the order to use them in, the fit check before drafting and the rules for a draft. Claude Code installs it as a plugin (it asks for the command from the block above); Codex finds it by itself when run inside the Landed checkout, or link it into your user skills with the last line.",
      text: `claude plugin marketplace add 3333444n/landed\nclaude plugin install landed@landed\nmkdir -p ~/.agents/skills && ln -s "$PWD/.agents/skills/landed" ~/.agents/skills/landed`,
    },
  ];
}

/** Connect your assistant (ADR 013): the copyable registration block for each assistant. */
export default function AssistantSetupPage() {
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
        Your assistant can maintain your profile and career records, read your jobs, and return
        drafts through Landed. You can ask it to add a skill, update a role, or delete an individual
        record. Drafts pass the same checks as generated or pasted documents. The assistant starts
        Landed itself and talks to it directly, so nothing is published on the network.
      </p>
      {blocks().map((block) => (
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
      ))}
    </Column>
  );
}
