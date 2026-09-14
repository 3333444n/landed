import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { Card, CardList } from "@/components/Card";
import { Column } from "@/components/Column";
import {
  listAchievements,
  listEducation,
  listEmployment,
  listProjects,
  listSkills,
} from "@/modules/profile";

export const dynamic = "force-dynamic";

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** The About me hub: one card per record type, each opening its list in the next column. */
export default async function AboutLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const [employment, education, projects, skills, achievements] = await Promise.all([
    listEmployment(deps(), profile.id),
    listEducation(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
    listAchievements(deps(), profile.id),
  ]);
  const cards = [
    { href: "/about/profile", title: "Profile", subtitle: "How you appear on a resume" },
    {
      href: "/about/work-history",
      title: "Work history",
      subtitle: count(employment.length, "role"),
    },
    {
      href: "/about/education",
      title: "Education",
      subtitle: count(education.length, "record"),
    },
    { href: "/about/projects", title: "Projects", subtitle: count(projects.length, "project") },
    { href: "/about/skills", title: "Skills", subtitle: count(skills.length, "skill") },
    {
      href: "/about/achievements",
      title: "Achievements",
      subtitle: count(achievements.length, "achievement"),
    },
  ];

  return (
    <>
      <Column title="About me" subtitle="Your career facts, in your own words.">
        <CardList label="About me">
          {cards.map((card) => (
            <li key={card.href}>
              <Card href={card.href} title={card.title} subtitle={card.subtitle} />
            </li>
          ))}
        </CardList>
      </Column>
      {children}
    </>
  );
}
