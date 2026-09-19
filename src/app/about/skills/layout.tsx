import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { CardList } from "@/components/Card";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listSkills } from "@/modules/profile";

import { SkillCard } from "../RecordCards";

export const dynamic = "force-dynamic";

export default async function SkillsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const skills = await listSkills(deps(), profile.id);

  return (
    <>
      <Column
        icon={<Lightbulb />}
        title="Skills"
        count={skills.length}
        subtitle="Named capabilities you can point achievements at."
        parentHref="/about"
        parentTitle="About me"
        toolbar={<Toolbar right={<AddLink href="/about/skills/new" label="Add skill" />} />}
      >
        {skills.length === 0 ? (
          <EmptyState>No skills yet. Add the first one with the plus.</EmptyState>
        ) : (
          <CardList label="Skills">
            {skills.map((skill) => (
              <li key={skill.id}>
                <SkillCard record={skill} />
              </li>
            ))}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}
