"use client";

import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardList } from "@/components/Card";
import { AddLink } from "@/components/Toolbar";
import { FilterChips } from "@/components/FilterChips";
import type {
  AchievementWithSkills,
  EmploymentRecord,
  ProjectRecord,
  SkillWithContexts,
} from "@/modules/profile";
import { AchievementCard, Facts, SkillCard } from "./RecordCards";
import { achievementContext, matchesContext, skillContext } from "./context-filters";
import styles from "./CareerList.module.css";

export function CareerList({
  kind,
  roles,
  projects,
  skills,
  achievements,
  nested = false,
}: {
  kind: "skills" | "achievements";
  roles: EmploymentRecord[];
  projects: ProjectRecord[];
  skills: SkillWithContexts[];
  achievements: AchievementWithSkills[];
  nested?: boolean;
}) {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const roleKey = `${kind}Role`;
  const projectKey = `${kind}Project`;
  const role = search.getAll(roleKey);
  const project = search.getAll(projectKey);
  const update = (updates: Record<string, string[]>) => {
    const next = new URLSearchParams(search.toString());
    Object.entries(updates).forEach(([key, values]) => {
      next.delete(key);
      values.forEach((value) => next.append(key, value));
    });
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const label = kind === "skills" ? "Skills" : "Achievements";
  const shownSkills = skills.filter((skill) =>
    matchesContext(skillContext(skill, achievements, projects), role, project),
  );
  const shownAchievements = achievements.filter((achievement) =>
    matchesContext(achievementContext(achievement, projects), role, project),
  );
  const total = kind === "skills" ? skills.length : achievements.length;
  const count = kind === "skills" ? shownSkills.length : shownAchievements.length;
  const contextNames = (record: SkillWithContexts) => {
    const context = skillContext(record, achievements, projects);
    return (
      <Facts
        items={[
          ["Category", record.category],
          [
            "Linked roles",
            roles
              .filter((r) => record.employmentIds.includes(r.id))
              .map((r) => `${r.role} at ${r.employerName}`)
              .join(", ") || "None",
          ],
          [
            "Linked projects",
            projects
              .filter((p) => record.projectIds.includes(p.id))
              .map((p) => p.name)
              .join(", ") || "None",
          ],
          [
            "Roles through evidence or projects",
            roles
              .filter(
                (r) => context.employmentIds.includes(r.id) && !record.employmentIds.includes(r.id),
              )
              .map((r) => `${r.role} at ${r.employerName}`)
              .join(", "),
          ],
          [
            "Projects through evidence",
            projects
              .filter((p) => context.projectIds.includes(p.id) && !record.projectIds.includes(p.id))
              .map((p) => p.name)
              .join(", "),
          ],
        ]}
      />
    );
  };
  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <details className={styles.filters}>
          <summary
            aria-label={`Filter ${kind}`}
            title={`Filter ${kind}`}
            className={styles.trigger}
          >
            <SlidersHorizontal aria-hidden="true" />
            {role.length || project.length ? <span className={styles.dot} /> : null}
          </summary>
          <div className={styles.panel} aria-label={`${label} filters`}>
            <FilterChips
              label="Roles"
              allLabel="All roles"
              value={role}
              onChange={(values) => update({ [roleKey]: values })}
              options={[
                ...roles.map((r) => ({ value: r.id, label: `${r.role} at ${r.employerName}` })),
                { value: "none", label: "No role" },
              ]}
            />
            <FilterChips
              label="Projects"
              allLabel="All projects"
              value={project}
              onChange={(values) => update({ [projectKey]: values })}
              options={[
                ...projects.map((p) => ({ value: p.id, label: p.name })),
                { value: "none", label: "No project" },
              ]}
            />
            <button
              type="button"
              className={styles.clear}
              onClick={() => update({ [roleKey]: [], [projectKey]: [] })}
            >
              Clear filters
            </button>
          </div>
        </details>
        <div className={styles.add}>
          <AddLink
            href={`/about/${kind}/new`}
            label={kind === "skills" ? "Add skill" : "Add achievement"}
          />
        </div>
      </div>
      <p className="text-secondary" aria-live="polite">
        {count} of {total} {kind}
        {role.length || project.length ? " · Filtered" : ""}
      </p>
      {count ? (
        <CardList label={nested ? `${label} overview` : label}>
          {kind === "skills"
            ? shownSkills.map((record) => (
                <li key={record.id}>
                  <SkillCard record={record} nested={nested}>
                    {contextNames(record)}
                  </SkillCard>
                </li>
              ))
            : shownAchievements.map((record) => (
                <li key={record.id}>
                  <AchievementCard
                    record={record}
                    roles={roles}
                    projects={projects}
                    skills={skills}
                    nested={nested}
                  />
                </li>
              ))}
        </CardList>
      ) : (
        <p className="text-secondary">
          {total
            ? "No matches. Change or clear the filters."
            : `No ${kind} yet. Add the first with the plus.`}
        </p>
      )}
    </div>
  );
}
