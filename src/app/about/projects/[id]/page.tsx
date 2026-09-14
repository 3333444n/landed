import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getProject, listEmployment } from "@/modules/profile";
import { deleteProjectAction, saveProjectAction } from "../actions";
import { ProjectForm } from "../ProjectForm";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [project, roles] = await Promise.all([
    getProject(deps(), profile.id, id),
    listEmployment(deps(), profile.id),
  ]);
  if (!project) notFound();

  return (
    <Column title={project.name} parentHref="/about/projects" parentTitle="Projects" width="detail">
      <ProjectForm
        action={saveProjectAction.bind(null, project.id)}
        submitLabel="Save changes"
        jobs={roles.map((role) => ({
          value: role.id,
          label: `${role.role} at ${role.employerName}`,
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
      <ConfirmDelete action={deleteProjectAction.bind(null, project.id)} what="project" />
    </Column>
  );
}
