import { Award } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { Card, CardList } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listAchievements, listEmployment, listProjects, listSkills } from "@/modules/profile";

export const dynamic = "force-dynamic";

export default async function AchievementsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const [achievements, roles, projects, skills] = await Promise.all([
    listAchievements(deps(), profile.id),
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
  ]);
  const roleNames = new Map(roles.map((r) => [r.id, `${r.role} at ${r.employerName}`]));
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const skillNames = new Map(skills.map((s) => [s.id, s.displayName]));

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
            {achievements.map((a) => {
              const context = a.employmentId
                ? roleNames.get(a.employmentId)
                : a.projectId
                  ? projectNames.get(a.projectId)
                  : undefined;
              const meta = [
                a.metric ? `Metric: ${a.metric}` : "",
                a.sourceNote ? `Source: ${a.sourceNote}` : "",
              ].filter(Boolean);
              return (
                <li key={a.id}>
                  <Card
                    icon={<Award />}
                    href={`/about/achievements/${a.id}`}
                    title={a.statement}
                    subtitle={context}
                    meta={meta}
                    chips={
                      <>
                        {a.reviewed ? (
                          <Chip tone="success">Reviewed</Chip>
                        ) : (
                          <Chip tone="warning">Needs review</Chip>
                        )}
                        {a.skillIds.map((id) => {
                          const name = skillNames.get(id);
                          return name ? <Chip key={id}>{name}</Chip> : null;
                        })}
                      </>
                    }
                  />
                </li>
              );
            })}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}
