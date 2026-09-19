/** Only these presentation parameters can travel through career links and redirects. */
export const careerFilterKeys = [
  "skillsRole",
  "skillsProject",
  "achievementsRole",
  "achievementsProject",
] as const;
export function careerFilterQuery(search: { getAll: (name: string) => string[] }): string {
  const query = new URLSearchParams();
  for (const key of careerFilterKeys) {
    for (const value of new Set(search.getAll(key))) {
      if (value === "none" || /^[0-9a-f-]{36}$/i.test(value)) query.append(key, value);
    }
  }
  return query.toString();
}
export function withCareerFilters(href: string, query: string): string {
  return query && (href === "/about" || href.startsWith("/about/")) ? `${href}?${query}` : href;
}
export function careerRedirect(href: string, formData: FormData): string {
  const raw = formData.get("_careerFilters");
  return withCareerFilters(
    href,
    careerFilterQuery(new URLSearchParams(typeof raw === "string" ? raw : "")),
  );
}
