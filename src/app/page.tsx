import Link from "next/link";
import { createProfileAction } from "@/app/actions";
import buttonStyles from "@/components/Button.module.css";
import { Card } from "@/components/Card";
import { Page, Section, pageStyles } from "@/components/Page";
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
      <main className={styles.main}>
        <div className={styles.section}>
          <h1 className="title-xl">Welcome to Landed</h1>
          <p className="text-secondary">Start with your name. Everything else can follow.</p>
        </div>
        <Card>
          <ProfileNameForm action={createProfileAction} />
        </Card>
      </main>
    );
  }

  const [achievements, employment, education, projects, skills] = await Promise.all([
    listAchievements(deps, profile.id),
    listEmployment(deps, profile.id),
    listEducation(deps, profile.id),
    listProjects(deps, profile.id),
    listSkills(deps, profile.id),
  ]);
  const lines = [
    { href: "/achievements", text: count(achievements.length, "achievement") },
    { href: "/experience", text: count(employment.length, "job") },
    { href: "/experience", text: count(education.length, "education record") },
    { href: "/experience", text: count(projects.length, "project") },
    { href: "/skills", text: count(skills.length, "skill") },
  ];

  return (
    <Page title={profile.displayName} subtitle="Your career facts, in your own words.">
      <Section title="What you have so far">
        <Card>
          <div className={pageStyles.stack}>
            <ul className={styles.list}>
              {lines.map((line) => (
                <li key={line.text}>
                  <Link href={line.href}>{line.text}</Link>
                </li>
              ))}
            </ul>
            <div>
              <Link
                href="/achievements"
                className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.action}`}
              >
                Add an achievement
              </Link>
            </div>
          </div>
        </Card>
      </Section>
    </Page>
  );
}
