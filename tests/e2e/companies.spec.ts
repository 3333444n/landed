import { expect, test } from "@playwright/test";
test("companies retain sourced findings and can be selected for a job", async ({ page }) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill("Alex Example");
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByRole("heading", { name: "Alex Example", exact: true })).toBeVisible();
  }
  await page.goto("/companies/new");
  await page.getByLabel("Name", { exact: true }).fill("Example Labs");
  await page.getByLabel("Location", { exact: true }).fill("Remote");
  await page.getByLabel("Website", { exact: true }).fill("https://example.com");
  await page.getByLabel("About", { exact: true }).fill("Builds public tools.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]+$/);
  const companyUrl = page.url();
  await page.getByRole("link", { name: "Add finding" }).click();
  await page.getByLabel("Finding", { exact: true }).fill("Released a public tool in 2026.");
  await page.getByLabel("Source URL", { exact: true }).fill("https://example.com/news");
  await page.getByLabel("Retrieved on").fill("2026-09-23");
  await page
    .getByRole("region", { name: "New finding", exact: true })
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page).toHaveURL(companyUrl);
  await expect(page.getByRole("table")).toContainText("Released a public tool in 2026.");
  await page.goto("/jobs/new");
  await page.getByLabel("Title", { exact: true }).fill("Tool developer");
  await page.getByRole("combobox", { name: "Company" }).fill("Example Labs");
  await page.getByRole("option", { name: "Example Labs", exact: true }).click();
  await page.getByLabel("Description", { exact: true }).fill("Build public tools for developers.");
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
  const jobUrl = page.url();
  await page.goto(`${jobUrl}/interest`);
  await page.getByRole("combobox", { name: "Company findings" }).fill("Released");
  await page.getByRole("option", { name: "Released a public tool in 2026.", exact: true }).click();
  const findingForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save findings", exact: true }) });
  const versionField = findingForm.locator('input[name="expectedUpdatedAt"]');
  const previousVersion = await versionField.inputValue();
  await page.getByRole("button", { name: "Save findings", exact: true }).click();
  await expect(versionField).not.toHaveValue(previousVersion);
  await page.reload();
  await expect(
    page.getByText("Released a public tool in 2026.", { exact: true }).last(),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("interest.png"), fullPage: true });
  await page.goto(jobUrl);
  await page
    .getByRole("list", { name: "Materials" })
    .getByRole("link")
    .filter({ hasText: /^Company/ })
    .click();
  await expect(page).toHaveURL(companyUrl);
  await page.screenshot({ path: test.info().outputPath("company.png"), fullPage: true });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Other records still reference" }),
  ).toBeVisible();
  await page.goto(jobUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page).toHaveURL(/\/jobs$/);
});
