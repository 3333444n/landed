import { Award } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { listAchievements, listEmployment, listProjects, listSkills } from "@/modules/profile";
import { CareerList } from "../CareerList";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: ReactNode }) {
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
        parentTitle="Profile"
      >
        <CareerList
          kind="achievements"
          roles={roles}
          projects={projects}
          skills={skills}
          achievements={achievements}
        />
      </Column>
      {children}
    </>
  );
}
