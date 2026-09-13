import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Page, Section } from "@/components/Page";
import { getProject, listEmployment } from "@/modules/profile";
import { saveProjectAction } from "../../actions";
import { ProjectForm } from "../../ProjectForm";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [project, jobs] = await Promise.all([
    getProject(deps(), profile.id, id),
    listEmployment(deps(), profile.id),
  ]);
  if (!project) notFound();

  return (
    <Page title="Edit project" subtitle={project.name}>
      <Section>
        <Card>
          <ProjectForm
            action={saveProjectAction.bind(null, project.id)}
            submitLabel="Save changes"
            jobs={jobs.map((job) => ({
              value: job.id,
              label: `${job.role} at ${job.employerName}`,
            }))}
            record={{
              name: project.name,
              description: project.description ?? "",
              url: project.url ?? "",
              employmentId: project.employmentId ?? "",
              startYear: project.startYear === null ? "" : String(project.startYear),
              startMonth: project.startMonth === null ? "" : String(project.startMonth),
              endYear: project.endYear === null ? "" : String(project.endYear),
              endMonth: project.endMonth === null ? "" : String(project.endMonth),
              expectedUpdatedAt: project.updatedAt.toISOString(),
            }}
          />
        </Card>
      </Section>
    </Page>
  );
}
