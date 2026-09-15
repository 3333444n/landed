"use client";

import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToolbarMenu } from "@/components/ToolbarMenu";
import { filterLabels, listFilters, listSorts, sortLabels } from "@/modules/applications/contracts";
import { defaultFilter, defaultSort, readListParams } from "./list-params";

/** Filter and sort menus that rewrite the address; nothing is stored. */
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
      <ToolbarMenu
        label="Filter"
        icon={<SlidersHorizontal />}
        value={filter}
        defaultValue={defaultFilter}
        onChange={(value) => update({ filter: value })}
        options={listFilters.map((value) => ({ value, label: filterLabels[value] }))}
      />
      <ToolbarMenu
        label="Sort"
        icon={<ArrowUpDown />}
        value={sort}
        defaultValue={defaultSort}
        onChange={(value) => update({ sort: value })}
        options={listSorts.map((value) => ({ value, label: sortLabels[value] }))}
      />
    </>
  );
}
