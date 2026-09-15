import { Briefcase } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getEmployment } from "@/modules/profile";
import { deleteEmploymentAction, saveEmploymentAction } from "../actions";
import { EmploymentForm } from "../EmploymentForm";

export const dynamic = "force-dynamic";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const role = await getEmployment(deps(), profile.id, id);
  if (!role) notFound();

  return (
    <Column
      icon={<Briefcase />}
      title={role.role}
      subtitle={role.employerName}
      parentHref="/about/work-history"
      parentTitle="Work history"
      width="detail"
    >
      <EmploymentForm
        action={saveEmploymentAction.bind(null, role.id)}
        submitLabel="Save changes"
        record={{
          employerName: role.employerName,
          role: role.role,
          startYear: role.startYear === null ? "" : String(role.startYear),
          startMonth: role.startMonth === null ? "" : String(role.startMonth),
          endYear: role.endYear === null ? "" : String(role.endYear),
          endMonth: role.endMonth === null ? "" : String(role.endMonth),
          isCurrent: role.isCurrent ? "on" : "",
          description: role.description ?? "",
          expectedUpdatedAt: role.updatedAt.toISOString(),
        }}
      />
      <ConfirmDelete action={deleteEmploymentAction.bind(null, role.id)} what="role" />
    </Column>
  );
}
