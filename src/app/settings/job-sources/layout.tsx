import { Tags } from "lucide-react";
import type { ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { listJobSources } from "@/modules/jobs";
import { Column } from "@/components/Column";
import { Card, CardList } from "@/components/Card";
import { Toolbar, AddLink } from "@/components/Toolbar";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const sources = await listJobSources(deps(), profile.id);
  return (
    <>
      <Column
        icon={<Tags />}
        title="Job Sources"
        parentHref="/settings"
        parentTitle="Settings"
        count={sources.length}
        subtitle="Where you find openings."
      >
        <Toolbar right={<AddLink href="/settings/job-sources/new" label="Add source" />} />
        <CardList label="Job Sources">
          {sources.map((source) => (
            <li key={source.id}>
              <Card
                href={`/settings/job-sources/${source.id}`}
                icon={<Tags />}
                title={source.name}
                subtitle={source.archived ? "Archived" : "Active"}
              />
            </li>
          ))}
        </CardList>
        {!sources.length ? <p>No sources yet. Add the places where you find jobs.</p> : null}
      </Column>
      {children}
    </>
  );
}
