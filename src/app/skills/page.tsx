import Link from "next/link";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { EmptyState, Page, Section, pageStyles } from "@/components/Page";
import { listSkills } from "@/modules/profile";
import { deleteSkillAction, saveSkillAction } from "./actions";
import { SkillForm } from "./SkillForm";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const profile = await requireProfile();
  const skills = await listSkills(deps(), profile.id);

  return (
    <Page title="Skills" subtitle="Named capabilities you can point achievements at.">
      <Section title="Add a skill">
        <Card>
          <SkillForm action={saveSkillAction.bind(null, undefined)} submitLabel="Save skill" />
        </Card>
      </Section>
      <Section title="Your skills">
        {skills.length === 0 ? (
          <EmptyState>No skills yet. Add the first one above.</EmptyState>
        ) : (
          <ul className={pageStyles.list} aria-label="Skills">
            {skills.map((skill) => (
              <li key={skill.id}>
                <Card>
                  <div className={pageStyles.itemHeader}>
                    <div className={pageStyles.stack}>
                      <h3 className="title-md">{skill.displayName}</h3>
                      {skill.category ? <p className={pageStyles.meta}>{skill.category}</p> : null}
                    </div>
                    <div className={pageStyles.itemActions}>
                      <Link href={`/skills/${skill.id}`} className={pageStyles.link}>
                        Edit
                      </Link>
                      <ConfirmDelete action={deleteSkillAction.bind(null, skill.id)} what="skill" />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
