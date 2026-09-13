import { notFound } from "next/navigation";
import { deps, requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Page, Section } from "@/components/Page";
import { getEmployment } from "@/modules/profile";
import { saveEmploymentAction } from "../../actions";
import { EmploymentForm } from "../../EmploymentForm";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getEmployment(deps(), profile.id, id);
  if (!job) notFound();

  return (
    <Page title="Edit job" subtitle={`${job.role} at ${job.employerName}`}>
      <Section>
        <Card>
          <EmploymentForm
            action={saveEmploymentAction.bind(null, job.id)}
            submitLabel="Save changes"
            record={{
              employerName: job.employerName,
              role: job.role,
              startYear: job.startYear === null ? "" : String(job.startYear),
              startMonth: job.startMonth === null ? "" : String(job.startMonth),
              endYear: job.endYear === null ? "" : String(job.endYear),
              endMonth: job.endMonth === null ? "" : String(job.endMonth),
              isCurrent: job.isCurrent ? "on" : "",
              description: job.description ?? "",
              expectedUpdatedAt: job.updatedAt.toISOString(),
            }}
          />
        </Card>
      </Section>
    </Page>
  );
}
