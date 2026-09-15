import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { dateRange } from "@/app/form-state";
import { Card, CardList } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listEducation, type EducationStatus } from "@/modules/profile";

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

export default async function EducationLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const records = await listEducation(deps(), profile.id);

  return (
    <>
      <Column
        icon={<GraduationCap />}
        title="Education"
        count={records.length}
        subtitle="Programmes and qualifications, finished or not."
        parentHref="/about"
        parentTitle="About me"
        toolbar={<Toolbar right={<AddLink href="/about/education/new" label="Add education" />} />}
      >
        {records.length === 0 ? (
          <EmptyState>No education yet. Add the first record with the plus.</EmptyState>
        ) : (
          <CardList label="Education">
            {records.map((record) => {
              const range = dateRange(record);
              const detail = [record.qualification, record.subject].filter(Boolean).join(", ");
              return (
                <li key={record.id}>
                  <Card
                    icon={<GraduationCap />}
                    href={`/about/education/${record.id}`}
                    title={record.institution}
                    subtitle={detail || undefined}
                    meta={range ? [range] : []}
                    chips={
                      <Chip tone={statusTones[record.status]}>{statusLabels[record.status]}</Chip>
                    }
                  />
                </li>
              );
            })}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}
