import { expect, it } from "vitest";
import { companyInput, findingInput } from "./contracts";
import { findingSelectionInput } from "../jobs/contracts";
const id = "10000000-0000-4000-8000-000000000001";
it("requires a name and safe web links while accepting empty optional context", () => {
  expect(
    companyInput.safeParse({ id, name: "Example", website: "javascript:alert(1)" }).success,
  ).toBe(false);
  expect(companyInput.safeParse({ id, name: "  " }).success).toBe(false);
  expect(companyInput.parse({ id, name: "Example", about: "", website: "" })).toMatchObject({
    name: "Example",
    about: undefined,
    website: undefined,
  });
});
it("requires provenance and a valid interpretation label for findings", () => {
  const f = {
    id,
    text: "Customers report slow onboarding",
    sourceUrl: "https://example.com/review",
    retrievedAt: "2026-09-23",
    kind: "interpretation",
  };
  expect(findingInput.safeParse(f).success).toBe(true);
  expect(findingInput.safeParse({ ...f, retrievedAt: "2026-02-30" }).success).toBe(false);
  expect(findingInput.safeParse({ ...f, kind: "fact" }).success).toBe(false);
});
it("rejects duplicate or excessive selections", () => {
  const expectedUpdatedAt = "2026-09-23T00:00:00.000Z";
  expect(findingSelectionInput.safeParse({ findingIds: [id, id], expectedUpdatedAt }).success).toBe(
    false,
  );
  expect(
    findingSelectionInput.safeParse({ findingIds: Array(6).fill(id), expectedUpdatedAt }).success,
  ).toBe(false);
});
