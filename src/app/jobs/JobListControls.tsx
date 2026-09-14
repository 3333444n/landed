"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import { filterLabels, listFilters, listSorts, sortLabels } from "@/modules/applications/contracts";
import { defaultFilter, defaultSort, readListParams } from "./list-params";

/** Filter and sort selects that rewrite the address; nothing is stored. */
export function JobListControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filter, sort } = readListParams(searchParams);

  const update = (next: { filter?: string; sort?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilter = next.filter ?? filter;
    const nextSort = next.sort ?? sort;
    if (nextFilter === defaultFilter) params.delete("filter");
    else params.set("filter", nextFilter);
    if (nextSort === defaultSort) params.delete("sort");
    else params.set("sort", nextSort);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <ToolbarSelect
        label="Filter"
        value={filter}
        onChange={(e) => update({ filter: e.target.value })}
        options={listFilters.map((value) => ({ value, label: filterLabels[value] }))}
      />
      <ToolbarSelect
        label="Sort"
        value={sort}
        onChange={(e) => update({ sort: e.target.value })}
        options={listSorts.map((value) => ({ value, label: sortLabels[value] }))}
      />
    </>
  );
}
