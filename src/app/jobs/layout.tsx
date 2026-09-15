import { Briefcase } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { deps, requireProfile } from "@/app/current-profile";
import { Column, EmptyState } from "@/components/Column";
import { AddLink, Toolbar } from "@/components/Toolbar";
import { JobList } from "./JobList";
import { JobListControls } from "./JobListControls";
import { listJobRows } from "./list-jobs";

export const dynamic = "force-dynamic";

/**
 * The Jobs list column. Filters and sort are search parameters (ADR 005); a layout cannot read
 * them, so the server derives every row's status and the client list applies the filter.
 */
export default async function JobsLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const rows = await listJobRows(deps(), profile.id);

  return (
    <>
      <Column
        icon={<Briefcase />}
        title="Jobs"
        count={rows.length}
        subtitle="Postings you are pursuing, and later the ones found for you."
        toolbar={
          <Toolbar
            left={
              rows.length > 0 ? (
                <Suspense>
                  <JobListControls />
                </Suspense>
              ) : undefined
            }
            right={<AddLink href="/jobs/new" label="Add job" />}
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState>No jobs yet. Paste the first posting with the plus.</EmptyState>
        ) : (
          <Suspense>
            <JobList rows={rows} />
          </Suspense>
        )}
      </Column>
      {children}
    </>
  );
}
