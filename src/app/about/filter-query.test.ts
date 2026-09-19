import { expect, it } from "vitest";
import { careerFilterQuery, careerRedirect, withCareerFilters } from "./filter-query";
it("retains only career context parameters and keeps redirects local", () => {
  const query = careerFilterQuery(
    new URLSearchParams(
      "skillsRole=none&palette=steel&achievementsProject=invalid&next=https://example.com",
    ),
  );
  expect(query).toBe("skillsRole=none");
  expect(withCareerFilters("/about/skills/new", query)).toBe("/about/skills/new?skillsRole=none");
  expect(withCareerFilters("/jobs", query)).toBe("/jobs");
  const form = new FormData();
  form.set("_careerFilters", "skillsProject=none&next=https://example.com");
  expect(careerRedirect("/about/skills", form)).toBe("/about/skills?skillsProject=none");
});

it("preserves multiple selections and removes duplicates through form redirects", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const form = new FormData();
  form.set(
    "_careerFilters",
    `skillsRole=none&skillsRole=${id}&skillsRole=none&skillsProject=${id}`,
  );
  expect(careerRedirect("/about/skills", form)).toBe(
    `/about/skills?skillsRole=none&skillsRole=${id}&skillsProject=${id}`,
  );
});
