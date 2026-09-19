import { describe, expect, it } from "vitest";
import { achievementContext, matchesContext, skillContext } from "./context-filters";
const projects = [
  { id: "p1", employmentId: "r1" },
  { id: "p2", employmentId: null },
];
const achievements = [
  { employmentId: null, projectId: "p1", skillIds: ["s1"] },
  { employmentId: "r2", projectId: null, skillIds: ["s1"] },
];
describe("career context filters", () => {
  it("combines direct and evidence contexts without promoting role links to every project", () => {
    const skill = { id: "s1", employmentIds: ["r1"], projectIds: ["p2"] };
    const context = skillContext(skill, achievements, projects);
    expect(new Set(context.employmentIds)).toEqual(new Set(["r1", "r2"]));
    expect(new Set(context.projectIds)).toEqual(new Set(["p1", "p2"]));
    expect(skill.projectIds).toEqual(["p2"]);
    expect(
      skillContext({ id: "other", employmentIds: ["r1"], projectIds: [] }, achievements, projects)
        .projectIds,
    ).toEqual([]);
  });
  it("includes a project's parent role for both kinds, and responds to reassignment", () => {
    expect(achievementContext(achievements[0]!, projects).employmentIds).toEqual(["r1"]);
    expect(
      skillContext({ id: "other", employmentIds: [], projectIds: ["p1"] }, [], projects)
        .employmentIds,
    ).toEqual(["r1"]);
    expect(
      achievementContext(achievements[0]!, [{ id: "p1", employmentId: "new" }]).employmentIds,
    ).toEqual(["new"]);
  });
  it("combines filters with AND and distinguishes no context from all", () => {
    const context = { employmentIds: ["r1"], projectIds: ["p1"] };
    expect(matchesContext(context, "r1", "p1")).toBe(true);
    expect(matchesContext(context, "r2", "p1")).toBe(false);
    expect(matchesContext(context, "none", "")).toBe(false);
    expect(matchesContext({ employmentIds: [], projectIds: [] }, "none", "none")).toBe(true);
    expect(matchesContext(context, "", "")).toBe(true);
    expect(matchesContext(context, "missing", "")).toBe(false);
  });
});
