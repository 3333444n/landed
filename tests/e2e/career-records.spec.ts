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

test("profile, role, project, skill and a linked achievement survive a reload", async ({
  page,
}) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill(demo.displayName);
    await page.getByRole("button", { name: "Create profile" }).click();
  }
  await expect(page.getByRole("heading", { name: demo.displayName })).toBeVisible();

  // Profile details
  await page.goto("/about/profile");
  await page.getByLabel("Headline").fill("Software developer");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Remote").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByLabel("Headline")).toHaveValue("Software developer");
  await expect(page.getByLabel("Remote")).toBeChecked();

  // A role with month-only dates, created from the add control in the list column
  await page.goto("/about/work-history");
  await page.getByRole("link", { name: "Add role" }).click();
  await page.getByLabel("Employer").fill(demo.employer);
  await page.getByLabel("Role", { exact: true }).fill(demo.role);
  await page.getByLabel("Start year").fill("2023");
  await page.getByLabel("Month", { exact: true }).first().fill("4");
  await page.getByRole("button", { name: "Save role" }).click();
  await expect(
    page.getByRole("list", { name: "Work history" }).getByText(demo.employer),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/about\/work-history\/[0-9a-f-]+$/);
  const roleUrl = page.url();

  // A project linked to that role
  await page.goto("/about/projects/new");
  await page.getByLabel("Name").fill(demo.project);
  await page
    .getByLabel("Part of a role")
    .selectOption({ label: `${demo.role} at ${demo.employer}` });
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("list", { name: "Projects" }).getByText(demo.project)).toBeVisible();

  // Deleting the role is refused while the project references it
  await page.goto(roleUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page.getByText("Detach the 1 project that reference this role")).toBeVisible();

  // A skill
  await page.goto("/about/skills/new");
  await page.getByLabel("Skill", { exact: true }).fill(demo.skill);
  await page.getByRole("button", { name: "Save skill" }).click();
  await expect(page.getByRole("list", { name: "Skills" }).getByText(demo.skill)).toBeVisible();

  // An achievement linked to the project and the skill
  await page.goto("/about/achievements/new");
  await page.getByLabel("Statement").fill(demo.statement);
  await page.getByLabel("Project").selectOption({ label: demo.project });
  await page.getByRole("combobox", { name: "Skills used" }).click();
  await page.getByRole("combobox", { name: "Skills used" }).fill("not-a-skill");
  await expect(page.getByText("No matching skills.")).toBeVisible();
  await page.getByRole("combobox", { name: "Skills used" }).fill("post");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox", { name: "Skills used" })).toBeFocused();
  await expect(page.locator('input[name="skillIds"]')).toHaveCount(1);
  // Invalid submissions must retain the selection.
  await page.getByLabel("Statement").fill("");
  await page.getByRole("button", { name: "Save achievement" }).click();
  await expect(page.getByLabel("Statement")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('input[name="skillIds"]')).toHaveCount(1);
  await page.getByLabel("Statement").fill(demo.statement);
  await page.getByRole("button", { name: "Save achievement" }).click();
  await expect(page.getByRole("heading", { name: "Edit achievement" })).toBeVisible();
  const list = page.getByRole("list", { name: "Achievements" });
  await expect(list.getByText(demo.statement)).toBeVisible();
  await expect(list.getByText(demo.project)).toBeVisible();
  await expect(list.getByText(demo.skill, { exact: true })).toBeVisible();

  await expect(list.getByRole("heading", { name: demo.statement })).toHaveCSS("font-size", "15px");
  await expect(list.getByRole("heading", { name: demo.statement })).toHaveCSS("font-weight", "400");

  // Editing in place stays on the record and confirms the save
  await page.getByLabel("Metric").fill("2 forms");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  await page.reload();
  await expect(list.getByText(demo.statement)).toBeVisible();

  await page.getByRole("combobox", { name: "Skills used" }).click();
  await expect(page.getByRole("option", { name: demo.skill, exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("option", { name: demo.skill, exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByLabel("Statement").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Statement")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('input[name="skillIds"]')).toHaveCount(0);
  await page.getByLabel("Statement").fill(demo.statement);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.locator('input[name="skillIds"]')).toHaveCount(0);
  await expect(list.getByText(demo.skill, { exact: true })).toHaveCount(0);

  // The old Phase 0 addresses still land on the new columns
  await page.goto("/achievements");
  await expect(page).toHaveURL(/\/about\/achievements$/);

  // The home overview links to each record type with a count
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^\d+ achievements?$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^\d+ roles?$/ })).toBeVisible();
});
