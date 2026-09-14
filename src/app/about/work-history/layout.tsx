import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { dateRange } from "@/app/form-state";
import { Card, CardList } from "@/components/Card";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listEmployment } from "@/modules/profile";

export const dynamic = "force-dynamic";

export default async function WorkHistoryLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const roles = await listEmployment(deps(), profile.id);

  return (
    <>
      <Column
        title="Work history"
        count={roles.length}
        subtitle="Roles you have held, in your own words."
        parentHref="/about"
        parentTitle="About me"
        toolbar={<Toolbar right={<AddLink href="/about/work-history/new" label="Add role" />} />}
      >
        {roles.length === 0 ? (
          <EmptyState>No roles yet. Add the first one with the plus.</EmptyState>
        ) : (
          <CardList label="Work history">
            {roles.map((role) => {
              const range = dateRange(role, role.isCurrent);
              return (
                <li key={role.id}>
                  <Card
                    href={`/about/work-history/${role.id}`}
                    title={role.role}
                    subtitle={role.employerName}
                    meta={range ? [range] : []}
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
