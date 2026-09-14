"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardList } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/Column";
import { matchesFilter, sortJobs } from "@/modules/applications/rules";
import { readListParams } from "./list-params";
import type { JobRow } from "./list-jobs";

/** Filters and sorts the rows the server derived; the address is the only state. */
export function JobList({ rows }: { rows: JobRow[] }) {
  const { filter, sort } = readListParams(useSearchParams());
  const visible = sortJobs(
    rows
      .filter((row) => matchesFilter(filter, row.facts, row.derived))
      .map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })),
    sort,
  );

  if (visible.length === 0) {
    return <EmptyState>Nothing under this filter. Choose All to see every job.</EmptyState>;
  }
  return (
    <CardList label="Jobs">
      {visible.map((row) => (
        <li key={row.id}>
          <Card
            href={`/jobs/${row.id}`}
            title={row.title}
            subtitle={row.companyName}
            meta={[row.location ?? "", row.summary].filter(Boolean)}
            chips={
              <>
                <Chip tone={row.derived.chip.tone}>{row.derived.chip.label}</Chip>
                {row.derived.modifier ? (
                  <Chip tone={row.derived.modifier.tone}>{row.derived.modifier.label}</Chip>
                ) : null}
              </>
            }
          />
        </li>
      ))}
    </CardList>
  );
}
