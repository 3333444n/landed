import { expect, test } from "@playwright/test";

// Values from examples/demo-profile.json (fictional).
const demo = {
  displayName: "Alex Rivera",
  statement:
    "Reduced weekly report preparation from four hours to one by building a PostgreSQL-backed reporting tool.",
  metric: "4 hours to 1 hour per week",
  sourceNote: "Fictional user assertion for testing; no real employer data.",
};

test("a new installation creates a profile and saves an achievement that survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Landed" })).toBeVisible();

  await page.getByLabel("Your name").fill(demo.displayName);
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByRole("heading", { name: demo.displayName })).toBeVisible();

  // Validation: an empty statement is refused with a field error, nothing is saved, and the
  // other fields keep what was typed.
  await page.getByLabel("Metric").fill(demo.metric);
  await page.getByRole("button", { name: "Save achievement" }).click();
  await expect(page.getByLabel("Statement")).toHaveAccessibleDescription(
    "Write the factual statement",
  );
  await expect(page.getByText("No achievements yet")).toBeVisible();
  await expect(page.getByLabel("Metric")).toHaveValue(demo.metric);

  await page.getByLabel("Statement").fill(demo.statement);
  await page.getByLabel("Source note").fill(demo.sourceNote);
  await page.getByRole("button", { name: "Save achievement" }).click();

  await expect(page.getByRole("status")).toHaveText("Saved");
  const list = page.getByRole("list", { name: "Achievements" });
  await expect(list.getByText(demo.statement)).toBeVisible();
  await expect(list.getByText("Needs review")).toBeVisible();
  await expect(page.getByLabel("Statement")).toHaveValue("");

  await page.reload();
  await expect(page.getByRole("heading", { name: demo.displayName })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Achievements" }).getByText(demo.statement),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Achievements" }).getByRole("listitem")).toHaveCount(
    1,
  );
});
