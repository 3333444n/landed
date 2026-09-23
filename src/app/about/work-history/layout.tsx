import { Briefcase } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { CardList } from "@/components/Card";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { listEmployment } from "@/modules/profile";

import { RoleCard } from "../RecordCards";

export const dynamic = "force-dynamic";

export default async function WorkHistoryLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const roles = await listEmployment(deps(), profile.id);

  return (
    <>
      <Column
        icon={<Briefcase />}
        title="Work history"
        count={roles.length}
        subtitle="Roles you have held, in your own words."
        parentHref="/about"
        parentTitle="Profile"
        toolbar={<Toolbar right={<AddLink href="/about/work-history/new" label="Add role" />} />}
      >
        {roles.length === 0 ? (
          <EmptyState>No roles yet. Add the first one with the plus.</EmptyState>
        ) : (
          <CardList label="Work history">
            {roles.map((role) => (
              <li key={role.id}>
                <RoleCard record={role} />
              </li>
            ))}
          </CardList>
        )}
      </Column>
      {children}
    </>
  );
}
