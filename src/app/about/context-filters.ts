/** Browser-safe association rules. Derived links are never persisted as direct links. */
type Project = { id: string; employmentId: string | null };
type Achievement = { employmentId: string | null; projectId: string | null; skillIds: string[] };
type Skill = { id: string; employmentIds: string[]; projectIds: string[] };
export type Context = { employmentIds: string[]; projectIds: string[] };

export function achievementContext(achievement: Achievement, projects: Project[]): Context {
  const role =
    achievement.employmentId ??
    projects.find((project) => project.id === achievement.projectId)?.employmentId;
  return {
    employmentIds: role ? [role] : [],
    projectIds: achievement.projectId ? [achievement.projectId] : [],
  };
}
export function skillContext(
  skill: Skill,
  achievements: Achievement[],
  projects: Project[],
): Context {
  const employmentIds = new Set(skill.employmentIds);
  const projectIds = new Set(skill.projectIds);
  for (const achievement of achievements) {
    if (!achievement.skillIds.includes(skill.id)) continue;
    const context = achievementContext(achievement, projects);
    context.employmentIds.forEach((id) => employmentIds.add(id));
    context.projectIds.forEach((id) => projectIds.add(id));
  }
  for (const project of projects) {
    if (projectIds.has(project.id) && project.employmentId) employmentIds.add(project.employmentId);
  }
  return { employmentIds: [...employmentIds], projectIds: [...projectIds] };
}
export function matchesContext(context: Context, roles: string[], projects: string[]): boolean {
  const match = (ids: string[], values: string[]) =>
    values.length === 0 ||
    values.some((value) => (value === "none" ? ids.length === 0 : ids.includes(value)));
  return match(context.employmentIds, roles) && match(context.projectIds, projects);
}
