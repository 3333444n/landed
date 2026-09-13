import { expect, test } from "@playwright/test";

// Values from examples/demo-profile.json (fictional).
const demo = {
  displayName: "Alex Rivera",
  employer: "Example Workshop",
  role: "Software developer",
  project: "Community Tool Library",
  skill: "PostgreSQL",
  statement: "Implemented keyboard-accessible forms for recording tool loans.",
};

test("profile, job, project, skill and a linked achievement survive a reload", async ({ page }) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill(demo.displayName);
    await page.getByRole("button", { name: "Create profile" }).click();
  }
  await expect(page.getByRole("heading", { name: demo.displayName })).toBeVisible();

  // Profile details
  await page.goto("/profile");
  await page.getByLabel("Headline").fill("Software developer");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Remote").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByLabel("Headline")).toHaveValue("Software developer");
  await expect(page.getByLabel("Remote")).toBeChecked();

  // A job with month-only dates
  await page.goto("/experience");
  const jobs = page
    .getByRole("region", { name: "Jobs" })
    .or(page.locator("section").filter({ hasText: "Jobs" }).first());
  await jobs.getByLabel("Employer").fill(demo.employer);
  await jobs.getByLabel("Role").fill(demo.role);
  await jobs.getByLabel("Start year").fill("2023");
  await jobs.getByLabel("Month", { exact: true }).first().fill("4");
  await jobs.getByRole("button", { name: "Save job" }).click();
  await expect(page.getByRole("list", { name: "Jobs" }).getByText(demo.employer)).toBeVisible();

  // A project linked to that job
  const projects = page.getByRole("region", { name: "Projects" });
  await projects.getByLabel("Name").fill(demo.project);
  await projects
    .getByLabel("Part of a job")
    .selectOption({ label: `${demo.role} at ${demo.employer}` });
  await projects.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("list", { name: "Projects" }).getByText(demo.project)).toBeVisible();

  // Deleting the job is refused while the project references it
  const jobCard = page.getByRole("list", { name: "Jobs" }).getByRole("listitem").first();
  await jobCard.getByRole("button", { name: "Delete" }).click();
  await jobCard.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(jobCard.getByText("Detach the 1 project that reference this job")).toBeVisible();

  // A skill
  await page.goto("/skills");
  await page.getByLabel("Skill", { exact: true }).fill(demo.skill);
  await page.getByRole("button", { name: "Save skill" }).click();
  await expect(page.getByRole("list", { name: "Skills" }).getByText(demo.skill)).toBeVisible();

  // An achievement linked to the project and the skill
  await page.goto("/achievements");
  await page.getByLabel("Statement").fill(demo.statement);
  await page.getByLabel("Project").selectOption({ label: demo.project });
  await page.getByLabel(demo.skill).check();
  await page.getByRole("button", { name: "Save achievement" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  const list = page.getByRole("list", { name: "Achievements" });
  await expect(list.getByText(demo.statement)).toBeVisible();
  await expect(list.getByText(demo.project)).toBeVisible();
  await expect(list.getByText(demo.skill, { exact: true })).toBeVisible();

  await page.reload();
  await expect(list.getByText(demo.statement)).toBeVisible();

  // The home overview links to each record type with a count
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^\d+ achievements?$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^\d+ jobs?$/ })).toBeVisible();
});
