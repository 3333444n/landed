import { Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { listCompanies } from "@/modules/companies";
import { Column, EmptyState } from "@/components/Column";
import { Card, CardList } from "@/components/Card";
import { Toolbar, AddLink } from "@/components/Toolbar";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const companies = await listCompanies(deps(), profile.id);
  return (
    <>
      <Column
        icon={<Building2 />}
        title="Companies"
        count={companies.length}
        toolbar={<Toolbar right={<AddLink href="/companies/new" label="Add company" />} />}
      >
        {companies.length ? (
          <CardList label="Companies">
            {companies.map((company) => (
              <li key={company.id}>
                <Card
                  href={`/companies/${company.id}`}
                  title={company.name}
                  subtitle={company.location ?? undefined}
                  icon={<Building2 />}
                />
              </li>
            ))}
          </CardList>
        ) : (
          <EmptyState>Add a company to collect context for its jobs.</EmptyState>
        )}
      </Column>
      {children}
    </>
  );
}
