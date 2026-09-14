import Link from "next/link";
import { createProfileAction } from "@/app/actions";
import { Card } from "@/components/Card";
import { Column } from "@/components/Column";
import { ProfileNameForm } from "@/components/ProfileNameForm";
import { getDatabase } from "@/infrastructure/server";
import {
  getCurrentProfile,
  listAchievements,
  listEducation,
  listEmployment,
  listProjects,
  listSkills,
} from "@/modules/profile";
import { listJobs } from "@/modules/jobs";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export default async function HomePage() {
  const deps = { db: getDatabase().db };
  const profile = await getCurrentProfile(deps);

  if (!profile) {
    return (
      <Column
        title="Welcome to Landed"
        subtitle="Start with your name. Everything else can follow."
        width="detail"
      >
        <ProfileNameForm action={createProfileAction} />
      </Column>
    );
  }

  const [achievements, employment, education, projects, skills, jobs] = await Promise.all([
    listAchievements(deps, profile.id),
    listEmployment(deps, profile.id),
    listEducation(deps, profile.id),
    listProjects(deps, profile.id),
    listSkills(deps, profile.id),
    listJobs(deps, profile.id),
  ]);
  const lines = [
    { href: "/jobs", text: count(jobs.length, "job") },
    { href: "/about/achievements", text: count(achievements.length, "achievement") },
    { href: "/about/work-history", text: count(employment.length, "role") },
    { href: "/about/education", text: count(education.length, "education record") },
    { href: "/about/projects", text: count(projects.length, "project") },
    { href: "/about/skills", text: count(skills.length, "skill") },
  ];

  return (
    <Column
      title={profile.displayName}
      subtitle="Your career facts, in your own words."
      width="detail"
    >
      <Card title="What you have so far">
        <ul className={styles.list}>
          {lines.map((line) => (
            <li key={line.text}>
              <Link href={line.href}>{line.text}</Link>
            </li>
          ))}
        </ul>
      </Card>
    </Column>
  );
}
