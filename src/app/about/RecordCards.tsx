import { Award, Briefcase, FolderKanban, GraduationCap, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { dateRange } from "@/app/form-state";
import { ExpandableCard } from "@/components/ExpandableCard";
import { Chip } from "@/components/Chip";
import type {
  AchievementWithSkills,
  EducationRecord,
  EmploymentRecord,
  ProjectRecord,
  SkillRecord,
} from "@/modules/profile";
import styles from "./about.module.css";

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className={styles.facts}>
      {items
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
export function RoleCard({
  record,
  nested = false,
}: {
  record: EmploymentRecord;
  nested?: boolean;
}) {
  return (
    <ExpandableCard
      nested={nested}
      icon={<Briefcase />}
      title={record.role}
      subtitle={record.employerName}
      editHref={`/about/work-history/${record.id}`}
    >
      <Facts
        items={[
          ["Dates", dateRange(record, record.isCurrent)],
          ["Location", record.location],
          ["Description", record.description],
        ]}
      />
    </ExpandableCard>
  );
}
export function EducationCard({
  record,
  nested = false,
}: {
  record: EducationRecord;
  nested?: boolean;
}) {
  const labels = { in_progress: "In progress", completed: "Completed", incomplete: "Incomplete" };
  return (
    <ExpandableCard
      nested={nested}
      icon={<GraduationCap />}
      title={record.institution}
      subtitle={[record.qualification, record.subject].filter(Boolean).join(" · ")}
      editHref={`/about/education/${record.id}`}
    >
      <Facts
        items={[
          ["Dates", dateRange(record)],
          ["Status", labels[record.status]],
          ["Description", record.description],
        ]}
      />
    </ExpandableCard>
  );
}
export function ProjectCard({
  record,
  roles,
  nested = false,
}: {
  record: ProjectRecord;
  roles: EmploymentRecord[];
  nested?: boolean;
}) {
  const role = roles.find((r) => r.id === record.employmentId);
  return (
    <ExpandableCard
      nested={nested}
      icon={<FolderKanban />}
      title={record.name}
      subtitle={role ? `${role.role} at ${role.employerName}` : "Independent project"}
      editHref={`/about/projects/${record.id}`}
    >
      <Facts
        items={[
          ["Dates", dateRange(record)],
          ["Description", record.description],
          ["Link", record.url ? <a href={record.url}>{record.url}</a> : null],
        ]}
      />
    </ExpandableCard>
  );
}
export function SkillCard({
  record,
  nested = false,
  children,
}: {
  record: SkillRecord;
  nested?: boolean;
  children?: ReactNode;
}) {
  return (
    <ExpandableCard
      nested={nested}
      icon={<Lightbulb />}
      title={record.displayName}
      subtitle={record.category ?? undefined}
      editHref={`/about/skills/${record.id}`}
    >
      {children ?? (
        <p className="text-secondary">
          {record.category ? `Category: ${record.category}` : "No category set."}
        </p>
      )}
    </ExpandableCard>
  );
}
export function AchievementCard({
  record,
  roles,
  projects,
  skills,
  nested = false,
}: {
  record: AchievementWithSkills;
  roles: EmploymentRecord[];
  projects: ProjectRecord[];
  skills: SkillRecord[];
  nested?: boolean;
}) {
  const role = roles.find((r) => r.id === record.employmentId);
  const project = projects.find((p) => p.id === record.projectId);
  return (
    <ExpandableCard
      nested={nested}
      icon={<Award />}
      title={
        record.statement.length > 160
          ? `${record.statement.slice(0, 157).trimEnd()}…`
          : record.statement
      }
      titleStyle="body"
      subtitle={role ? `${role.role} at ${role.employerName}` : project?.name}
      editHref={`/about/achievements/${record.id}`}
      editLabel={`Edit achievement: ${record.statement}`}
    >
      <p>{record.statement}</p>
      <Facts
        items={[
          ["Problem", record.problem],
          ["Action", record.action],
          ["Result", record.result],
          ["Metric", record.metric],
          ["Source", record.sourceNote],
          [
            "Source link",
            record.sourceUrl ? <a href={record.sourceUrl}>{record.sourceUrl}</a> : null,
          ],
        ]}
      />
      <div className={styles.chips}>
        <Chip tone={record.reviewed ? "success" : "warning"}>
          {record.reviewed ? "Reviewed" : "Needs review"}
        </Chip>
        {record.skillIds.map((id) => {
          const skill = skills.find((s) => s.id === id);
          return skill ? <Chip key={id}>{skill.displayName}</Chip> : null;
        })}
      </div>
    </ExpandableCard>
  );
}
