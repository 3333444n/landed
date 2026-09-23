import { Plug, Settings, Tags } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardList } from "@/components/Card";
import { Column } from "@/components/Column";
import { getAssistantConfig, getModelStatus } from "@/infrastructure/server";
import type { ModelStatus } from "@/infrastructure/config";

export const dynamic = "force-dynamic";

function modelSubtitle(status: ModelStatus): string {
  switch (status.kind) {
    case "unconfigured":
      return "Paste back only";
    case "invalid":
      return "Configuration incomplete";
    case "fake":
      return "Test double";
    case "configured":
      return `${status.provider}, ${status.model}`;
  }
}

/** The Settings hub: one card per column, each opening it next to this list. Reads no database. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const assistant = getAssistantConfig();
  const cards = [
    {
      href: "/settings/job-sources",
      title: "Job Sources",
      subtitle: "Where you find openings",
      icon: Tags,
    },
    {
      href: "/settings/model",
      title: "Model setup",
      subtitle: modelSubtitle(getModelStatus()),
      icon: Settings,
    },
    {
      href: "/settings/assistant",
      title: "Connect your assistant",
      subtitle:
        assistant.kind === "configured"
          ? `Token ends in ····${assistant.tokenHint}`
          : "Not configured",
      icon: Plug,
    },
  ];

  return (
    <>
      <Column icon={<Settings />} title="Settings" subtitle="How documents get written.">
        <CardList label="Settings">
          {cards.map((card) => (
            <li key={card.href}>
              <Card
                href={card.href}
                icon={<card.icon />}
                title={card.title}
                subtitle={card.subtitle}
              />
            </li>
          ))}
        </CardList>
      </Column>
      {children}
    </>
  );
}
