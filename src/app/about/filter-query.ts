/** Only these presentation parameters can travel through career links and redirects. */
export const careerFilterKeys = [
  "skillsRole",
  "skillsProject",
  "achievementsRole",
  "achievementsProject",
] as const;
export function careerFilterQuery(search: { get: (name: string) => string | null }): string {
  const query = new URLSearchParams();
  for (const key of careerFilterKeys) {
    const value = search.get(key);
    if (value && (value === "none" || /^[0-9a-f-]{36}$/i.test(value))) query.set(key, value);
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
