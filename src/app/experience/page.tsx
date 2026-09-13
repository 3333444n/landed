import Link from "next/link";
import { deps, requireProfile } from "@/app/current-profile";
import { dateRange } from "@/app/form-state";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { EmptyState, Page, Section, pageStyles } from "@/components/Page";
import {
  listEducation,
  listEmployment,
  listProjects,
  type EducationStatus,
  type EmploymentRecord,
} from "@/modules/profile";
import {
  deleteEducationAction,
  deleteEmploymentAction,
  deleteProjectAction,
  saveEducationAction,
  saveEmploymentAction,
  saveProjectAction,
} from "./actions";
import { EducationForm } from "./EducationForm";
import { EmploymentForm } from "./EmploymentForm";
import { ProjectForm } from "./ProjectForm";

export const dynamic = "force-dynamic";

const statusLabels: Record<EducationStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  incomplete: "Incomplete",
};
const statusTones: Record<EducationStatus, "accent" | "success" | "warning"> = {
  in_progress: "accent",
  completed: "success",
  incomplete: "warning",
};

function jobLabel(job: Pick<EmploymentRecord, "role" | "employerName">): string {
  return `${job.role} at ${job.employerName}`;
}

export default async function ExperiencePage() {
  const profile = await requireProfile();
  const [jobs, education, projects] = await Promise.all([
    listEmployment(deps(), profile.id),
    listEducation(deps(), profile.id),
    listProjects(deps(), profile.id),
  ]);
  const jobOptions = jobs.map((job) => ({ value: job.id, label: jobLabel(job) }));
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  return (
    <Page title="Experience" subtitle="Jobs, education and projects, in your own words.">
      <Section title="Jobs">
        <Card>
          <EmploymentForm
            action={saveEmploymentAction.bind(null, undefined)}
            submitLabel="Save job"
          />
        </Card>
        {jobs.length === 0 ? (
          <EmptyState>No jobs yet. Add the first one above.</EmptyState>
        ) : (
          <ul className={pageStyles.list} aria-label="Jobs">
            {jobs.map((job) => {
              const range = dateRange(job, job.isCurrent);
              return (
                <li key={job.id}>
                  <Card>
                    <div className={pageStyles.itemHeader}>
                      <div className={pageStyles.stack}>
                        <h3 className="title-md">{job.role}</h3>
                        <p className={pageStyles.meta}>{job.employerName}</p>
                        {range ? <p className={pageStyles.meta}>{range}</p> : null}
                      </div>
                      <div className={pageStyles.itemActions}>
                        <Link href={`/experience/jobs/${job.id}`} className={pageStyles.link}>
                          Edit
                        </Link>
                        <ConfirmDelete
                          action={deleteEmploymentAction.bind(null, job.id)}
                          what="job"
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

      <Section title="Education">
        <Card>
          <EducationForm
            action={saveEducationAction.bind(null, undefined)}
            submitLabel="Save education"
          />
        </Card>
        {education.length === 0 ? (
          <EmptyState>No education yet. Add the first record above.</EmptyState>
        ) : (
          <ul className={pageStyles.list} aria-label="Education">
            {education.map((record) => {
              const range = dateRange(record);
              return (
                <li key={record.id}>
                  <Card>
                    <div className={pageStyles.itemHeader}>
                      <div className={pageStyles.stack}>
                        <h3 className="title-md">{record.institution}</h3>
                        {record.qualification || record.subject ? (
                          <p className={pageStyles.meta}>
                            {[record.qualification, record.subject].filter(Boolean).join(", ")}
                          </p>
                        ) : null}
                        {range ? <p className={pageStyles.meta}>{range}</p> : null}
                        <div className={pageStyles.chips}>
                          <Chip tone={statusTones[record.status]}>
                            {statusLabels[record.status]}
                          </Chip>
                        </div>
                      </div>
                      <div className={pageStyles.itemActions}>
                        <Link
                          href={`/experience/education/${record.id}`}
                          className={pageStyles.link}
                        >
                          Edit
                        </Link>
                        <ConfirmDelete
                          action={deleteEducationAction.bind(null, record.id)}
                          what="education record"
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

      <Section title="Projects">
        <Card>
          <ProjectForm
            action={saveProjectAction.bind(null, undefined)}
            submitLabel="Save project"
            jobs={jobOptions}
          />
        </Card>
        {projects.length === 0 ? (
          <EmptyState>No projects yet. Add the first one above.</EmptyState>
        ) : (
          <ul className={pageStyles.list} aria-label="Projects">
            {projects.map((project) => {
              const job = project.employmentId ? jobsById.get(project.employmentId) : undefined;
              const range = dateRange(project);
              return (
                <li key={project.id}>
                  <Card>
                    <div className={pageStyles.itemHeader}>
                      <div className={pageStyles.stack}>
                        <h3 className="title-md">{project.name}</h3>
                        {job ? <p className={pageStyles.meta}>{jobLabel(job)}</p> : null}
                        {range ? <p className={pageStyles.meta}>{range}</p> : null}
                        {project.url ? (
                          <p className={pageStyles.meta}>
                            <a href={project.url} rel="noreferrer">
                              {project.url}
                            </a>
                          </p>
                        ) : null}
                      </div>
                      <div className={pageStyles.itemActions}>
                        <Link
                          href={`/experience/projects/${project.id}`}
                          className={pageStyles.link}
                        >
                          Edit
                        </Link>
                        <ConfirmDelete
                          action={deleteProjectAction.bind(null, project.id)}
                          what="project"
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
