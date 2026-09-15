import { GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { getEducation } from "@/modules/profile";
import { deleteEducationAction, saveEducationAction } from "../actions";
import { EducationForm } from "../EducationForm";

export const dynamic = "force-dynamic";

export default async function EditEducationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const record = await getEducation(deps(), profile.id, id);
  if (!record) notFound();

  return (
    <Column
      icon={<GraduationCap />}
      title={record.institution}
      subtitle={[record.qualification, record.subject].filter(Boolean).join(", ") || undefined}
      parentHref="/about/education"
      parentTitle="Education"
      width="detail"
    >
      <EducationForm
        action={saveEducationAction.bind(null, record.id)}
        submitLabel="Save changes"
        record={{
          institution: record.institution,
          qualification: record.qualification ?? "",
          subject: record.subject ?? "",
          startYear: record.startYear === null ? "" : String(record.startYear),
          startMonth: record.startMonth === null ? "" : String(record.startMonth),
          endYear: record.endYear === null ? "" : String(record.endYear),
          endMonth: record.endMonth === null ? "" : String(record.endMonth),
          status: record.status,
          description: record.description ?? "",
          expectedUpdatedAt: record.updatedAt.toISOString(),
        }}
      />
      <ConfirmDelete action={deleteEducationAction.bind(null, record.id)} what="education record" />
    </Column>
  );
}
