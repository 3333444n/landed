import { createAchievementAction, createProfileAction } from "@/app/actions";
import { AchievementForm } from "@/components/AchievementForm";
import { Card } from "@/components/Card";
import { ProfileNameForm } from "@/components/ProfileNameForm";
import { getDatabase } from "@/infrastructure/server";
import { getCurrentProfile, listAchievements } from "@/modules/profile";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

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

  const achievements = await listAchievements(deps, profile.id);

  return (
    <main className={styles.main}>
      <div className={styles.section}>
        <h1 className="title-xl">{profile.displayName}</h1>
        <p className="text-secondary">Your career facts, in your own words.</p>
      </div>

      <div className={styles.section}>
        <h2 className="title-lg">Add an achievement</h2>
        <Card>
          <AchievementForm action={createAchievementAction} />
        </Card>
      </div>

      <div className={styles.section}>
        <h2 className="title-lg">Achievements</h2>
        {achievements.length === 0 ? (
          <p className="text-secondary">No achievements yet. The first one goes above.</p>
        ) : (
          <ul className={styles.list} aria-label="Achievements">
            {achievements.map((a) => (
              <li key={a.id}>
                <Card>
                  <p className="body-lg">{a.statement}</p>
                  {a.metric ? <p className={styles.meta}>Metric: {a.metric}</p> : null}
                  {a.sourceNote ? <p className={styles.meta}>Source: {a.sourceNote}</p> : null}
                  <span className={styles.chip}>{a.reviewed ? "Reviewed" : "Needs review"}</span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
