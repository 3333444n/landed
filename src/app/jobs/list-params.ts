/*
 * The list's filter and sort live in the address as search parameters (ADR 005). Browser-safe.
 */
import {
  listFilters,
  listSorts,
  type ListFilter,
  type ListSort,
} from "@/modules/applications/contracts";

export const defaultFilter: ListFilter = "needs_attention";
export const defaultSort: ListSort = "updated";

export function readListParams(params: { get(name: string): string | null }): {
  filter: ListFilter;
  sort: ListSort;
} {
  const filter = params.get("filter");
  const sort = params.get("sort");
  return {
    filter: (listFilters as readonly string[]).includes(filter ?? "")
      ? (filter as ListFilter)
      : defaultFilter,
    sort: (listSorts as readonly string[]).includes(sort ?? "") ? (sort as ListSort) : defaultSort,
  };
}
