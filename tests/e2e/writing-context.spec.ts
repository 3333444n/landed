import { expect, test } from "@playwright/test";

test("About me and Interest save and clear; Source can be created, archived and restored", async ({
  page,
}) => {
  await page.goto("/about/story");
  const story = page.getByLabel("About me", { exact: true });
  await story.fill("I enjoy making complicated workflows understandable.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(story).toHaveValue("I enjoy making complicated workflows understandable.");
  await story.fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(story).toHaveValue("");
  await page.goto("/jobs/new");
  await page.getByLabel("Title", { exact: true }).fill("Workflow developer");
  await page.getByLabel("Company", { exact: true }).fill("Example Systems");
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
  await page.goto(`${jobUrl}/interest`);
  const interest = page.getByLabel("Why this role and company?", { exact: true });
  await interest.fill("Their workflow tools connect with my reporting experience.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(interest).toHaveValue("Their workflow tools connect with my reporting experience.");
  await interest.fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.goto("/settings/job-sources");
  await page.getByRole("link", { name: /Community board/ }).click();
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
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Source", exact: true })).toHaveValue("");
});
