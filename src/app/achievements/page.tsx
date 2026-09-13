import Link from "next/link";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { EmptyState, Page, Section, pageStyles } from "@/components/Page";
import { listAchievements, listEmployment, listProjects, listSkills } from "@/modules/profile";
import { deleteAchievementAction, saveAchievementAction } from "./actions";
import { AchievementForm } from "./AchievementForm";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const profile = await requireProfile();
  const [achievements, employment, projects, skills] = await Promise.all([
    listAchievements(deps(), profile.id),
    listEmployment(deps(), profile.id),
    listProjects(deps(), profile.id),
    listSkills(deps(), profile.id),
  ]);
  const jobOptions = employment.map((j) => ({
    value: j.id,
    label: `${j.role} at ${j.employerName}`,
  }));
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const skillOptions = skills.map((s) => ({ value: s.id, label: s.displayName }));
  const jobNames = new Map(jobOptions.map((o) => [o.value, o.label]));
  const projectNames = new Map(projectOptions.map((o) => [o.value, o.label]));
  const skillNames = new Map(skillOptions.map((o) => [o.value, o.label]));

  return (
    <Page
      title="Achievements"
      subtitle="Factual statements, each backed by a source you can point to."
    >
      <Section title="Add an achievement">
        <Card>
          <AchievementForm
            action={saveAchievementAction.bind(null, undefined)}
            submitLabel="Save achievement"
            jobs={jobOptions}
            projects={projectOptions}
            skills={skillOptions}
          />
        </Card>
      </Section>
      <Section title="Your achievements">
        {achievements.length === 0 ? (
          <EmptyState>No achievements yet. The first one goes above.</EmptyState>
        ) : (
          <ul className={pageStyles.list} aria-label="Achievements">
            {achievements.map((a) => {
              const context = a.employmentId
                ? jobNames.get(a.employmentId)
                : a.projectId
                  ? projectNames.get(a.projectId)
                  : undefined;
              return (
                <li key={a.id}>
                  <Card>
                    <div className={pageStyles.itemHeader}>
                      <div className={pageStyles.stack}>
                        <p className="body-lg">{a.statement}</p>
                        {a.metric ? <p className={pageStyles.meta}>Metric: {a.metric}</p> : null}
                        {a.sourceNote ? (
                          <p className={pageStyles.meta}>Source: {a.sourceNote}</p>
                        ) : null}
                        {context ? <p className={pageStyles.meta}>{context}</p> : null}
                        <div className={pageStyles.chips}>
                          {a.reviewed ? (
                            <Chip tone="success">Reviewed</Chip>
                          ) : (
                            <Chip tone="warning">Needs review</Chip>
                          )}
                          {a.skillIds.map((id) => {
                            const name = skillNames.get(id);
                            return name ? <Chip key={id}>{name}</Chip> : null;
                          })}
                        </div>
                      </div>
                      <div className={pageStyles.itemActions}>
                        <Link href={`/achievements/${a.id}`} className={pageStyles.link}>
                          Edit
                        </Link>
                        <ConfirmDelete
                          action={deleteAchievementAction.bind(null, a.id)}
                          what="achievement"
                        />
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
