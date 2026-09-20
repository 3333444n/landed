import { Award } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { CardList } from "@/components/Card";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listAchievements, listEmployment, listProjects, listSkills } from "@/modules/profile";

import { AchievementCard } from "../RecordCards";

export const dynamic = "force-dynamic";

export default async function AchievementsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const [achievements, roles, projects, skills] = await Promise.all([
    listAchievements(deps(), profile.id),
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
  ]);

  return (
    <>
      <Column
        icon={<Award />}
        title="Achievements"
        count={achievements.length}
        subtitle="Factual statements, each backed by a source you can point to."
        parentHref="/about"
        parentTitle="About me"
        toolbar={
          <Toolbar right={<AddLink href="/about/achievements/new" label="Add achievement" />} />
        }
      >
        {achievements.length === 0 ? (
          <EmptyState>No achievements yet. Add the first one with the plus.</EmptyState>
        ) : (
          <CardList label="Achievements">
            {achievements.map((a) => (
              <li key={a.id}>
                <AchievementCard record={a} roles={roles} projects={projects} skills={skills} />
              </li>
            ))}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}
