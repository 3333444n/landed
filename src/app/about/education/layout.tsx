import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { CardList } from "@/components/Card";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listEducation } from "@/modules/profile";

import { EducationCard } from "../RecordCards";

export const dynamic = "force-dynamic";

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
        parentTitle="Profile"
        toolbar={<Toolbar right={<AddLink href="/about/education/new" label="Add education" />} />}
      >
        {records.length === 0 ? (
          <EmptyState>No education yet. Add the first record with the plus.</EmptyState>
        ) : (
          <CardList label="Education">
            {records.map((record) => (
              <li key={record.id}>
                <EducationCard record={record} />
              </li>
            ))}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}
