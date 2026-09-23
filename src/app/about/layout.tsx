import { Award, Briefcase, FolderKanban, GraduationCap, Lightbulb, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { CardList } from "@/components/Card";
import { Column } from "@/components/Column";
import {
  listAchievements,
  listEducation,
  listEmployment,
  listProjects,
  listSkills,
} from "@/modules/profile";

import { ExpandableCard } from "@/components/ExpandableCard";
import { Chip } from "@/components/Chip";
import { Facts, RoleCard, EducationCard, ProjectCard } from "./RecordCards";
import styles from "./about.module.css";
import { CareerList } from "./CareerList";

export const dynamic = "force-dynamic";

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Browse facts in disclosures; management and editing retain their own URL-driven columns. */
export default async function AboutLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const [employment, education, projects, skills, achievements] = await Promise.all([
    listEmployment(deps(), profile.id),
    listEducation(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
    listAchievements(deps(), profile.id),
  ]);
  const lists = [
    {
      title: "Work history",
      href: "/about/work-history",
      icon: Briefcase,
      subtitle: count(employment.length, "role"),
      content: employment.map((record) => (
        <li key={record.id}>
          <RoleCard record={record} nested />
        </li>
      )),
    },
    {
      title: "Education",
      href: "/about/education",
      icon: GraduationCap,
      subtitle: count(education.length, "record"),
      content: education.map((record) => (
        <li key={record.id}>
          <EducationCard record={record} nested />
        </li>
      )),
    },
    {
      title: "Projects",
      href: "/about/projects",
      icon: FolderKanban,
      subtitle: count(projects.length, "project"),
      content: projects.map((record) => (
        <li key={record.id}>
          <ProjectCard record={record} roles={employment} nested />
        </li>
      )),
    },
    {
      title: "Skills",
      href: "/about/skills",
      icon: Lightbulb,
      subtitle: count(skills.length, "skill"),
      content: [],
      filtered: (
        <CareerList
          kind="skills"
          roles={employment}
          projects={projects}
          skills={skills}
          achievements={achievements}
          nested
        />
      ),
    },
    {
      title: "Achievements",
      href: "/about/achievements",
      icon: Award,
      subtitle: count(achievements.length, "achievement"),
      content: [],
      filtered: (
        <CareerList
          kind="achievements"
          roles={employment}
          projects={projects}
          skills={skills}
          achievements={achievements}
          nested
        />
      ),
    },
  ];
  const summary =
    profile.summary && profile.summary.length > 240
      ? `${profile.summary.slice(0, 237).trimEnd()}…`
      : profile.summary;

  return (
    <>
      <Column icon={<UserRound />} title="Profile" subtitle="Your career facts, in your own words.">
        <CardList label="Profile">
          <li>
            <ExpandableCard
              title="General info"
              subtitle={profile.headline ?? "How you appear on a resume"}
              icon={<UserRound />}
              editHref="/about/profile"
            >
              <Facts
                items={[
                  ["Name", profile.displayName],
                  ["Headline", profile.headline],
                  ["Email", profile.email],
                  ["Phone", profile.phone],
                  ["Location", profile.location],
                  ["Summary", summary],
                  ...profile.links.map(
                    (link) =>
                      [
                        link.label,
                        <a key={link.label} href={link.url}>
                          {link.url}
                        </a>,
                      ] as [string, ReactNode],
                  ),
                  [
                    "Desired roles",
                    profile.preferences.desiredRoles?.length ? (
                      <div className={styles.chips}>
                        {profile.preferences.desiredRoles.map((role) => (
                          <Chip key={role}>{role}</Chip>
                        ))}
                      </div>
                    ) : null,
                  ],
                  ["Preferred locations", profile.preferences.locations?.join(", ")],
                  [
                    "Work arrangement",
                    profile.preferences.workArrangement
                      ?.map(
                        (value) =>
                          ({ remote: "Remote", hybrid: "Hybrid", onsite: "On site" })[value],
                      )
                      .join(", "),
                  ],
                  ["Constraints", profile.preferences.constraints],
                ]}
              />
            </ExpandableCard>
          </li>
          <li>
            <ExpandableCard
              title="About me"
              subtitle="Your story, values, and motivation"
              icon={<UserRound />}
              editHref="/about/story"
            >
              <p>
                {profile.aboutMe
                  ? profile.aboutMe.length > 240
                    ? `${profile.aboutMe.slice(0, 237)}…`
                    : profile.aboutMe
                  : "Nothing added yet."}
              </p>
            </ExpandableCard>
          </li>
          {lists.map((section) => (
            <li key={section.href}>
              <ExpandableCard
                title={section.title}
                subtitle={section.subtitle}
                icon={<section.icon />}
                editHref={section.href}
                editLabel={`Manage ${section.title.toLowerCase()}`}
              >
                {section.filtered ??
                  (section.content.length ? (
                    <CardList label={`${section.title} overview`}>{section.content}</CardList>
                  ) : (
                    <p className="text-secondary">Nothing added yet.</p>
                  ))}
              </ExpandableCard>
            </li>
          ))}
        </CardList>
      </Column>
      {children}
    </>
  );
}
