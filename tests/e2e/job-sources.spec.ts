import { createJobCompany } from "./company-helpers";
import { expect, test } from "@playwright/test";

test("Source can be created, archived, restored and cleared", async ({ page }) => {
  await page.goto("/jobs/new");
  await page.getByLabel("Title", { exact: true }).fill("Workflow developer");
  await createJobCompany(page, "Example Systems");
  await page.getByLabel("Description", { exact: true }).fill("Build understandable workflows.");
  await page.getByRole("button", { name: "Add a source", exact: true }).click();
  await page.getByLabel("New source name").fill("Community board");
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Source", exact: true })).toHaveValue(
    "Community board",
  );
  await page.getByRole("button", { name: "Save job", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
  const jobUrl = page.url();
  await page.goto("/settings/job-sources");
  await page.getByRole("link", { name: /Community board/ }).click();
  await expect(page).toHaveURL(/\/settings\/job-sources\/[0-9a-f-]+$/);
  const sourceUrl = page.url();
  await page.getByLabel("Status", { exact: true }).selectOption("true");
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.goto(`${jobUrl}/description`);
  await expect(page.getByRole("combobox", { name: "Source", exact: true })).toHaveValue(
    "Community board (Archived)",
  );
  await page.goto(sourceUrl);
  await page.getByLabel("Name", { exact: true }).fill("Local community board");
  await page.getByLabel("Status", { exact: true }).selectOption("false");
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.goto(`${jobUrl}/description`);
  await expect(page.getByRole("combobox", { name: "Source", exact: true })).toHaveValue(
    "Local community board",
  );
  await page.getByRole("button", { name: "Clear source", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Source", exact: true })).toHaveValue("");
  await page.goto(jobUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Delete this job and its application?")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
});
