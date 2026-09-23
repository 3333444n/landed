import { notFound } from "next/navigation";
import { Tags } from "lucide-react";
import { deps, requireProfile } from "@/app/current-profile";
import { getJobSource } from "@/modules/jobs";
import { Column } from "@/components/Column";
import { SourceForm } from "../SourceForm";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const source = await getJobSource(deps(), profile.id, id);
  if (!source) notFound();
  return (
    <Column
      icon={<Tags />}
      title={source.name}
      parentHref="/settings/job-sources"
      parentTitle="Job Sources"
      width="detail"
    >
      <SourceForm
        id={id}
        record={{
          name: source.name,
          archived: String(source.archived),
          expectedUpdatedAt: source.updatedAt.toISOString(),
        }}
      />
    </Column>
  );
}
