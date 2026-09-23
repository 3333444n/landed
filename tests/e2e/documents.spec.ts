import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Values from examples/demo-profile.json (fictional). The server runs the fake model adapter,
// which answers from examples/generation/fixtures.
const demo = {
  displayName: "Alex Rivera",
  title: "Full-stack developer",
  companyName: "Example Analytics",
  rawDescription:
    "Example Analytics is looking for a full-stack developer to build internal reporting tools.\n\nYou will work with PostgreSQL and TypeScript.",
};

test("a document is generated, reviewed in place, and another is pasted back", async ({ page }) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill(demo.displayName);
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByRole("heading", { name: demo.displayName })).toBeVisible();
  }

  await page.goto("/jobs/new");
  await page.getByLabel("Title").fill(demo.title);
  await page.getByLabel("Company", { exact: true }).fill(demo.companyName);
  await page.getByLabel("Description").fill(demo.rawDescription);
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
  const jobUrl = page.url();

  // The document cards are real now and start empty
  const materials = page.getByRole("list", { name: "Materials" });
  await expect(materials.getByText("Not started")).toHaveCount(3);
  await materials.getByRole("link", { name: /Resume/ }).click();
  await expect(page).toHaveURL(/\/resume$/);
  await expect(page.getByText("Nothing generated yet")).toBeVisible();

  // Generate through the fake adapter: fixture bullets appear with grounding warnings, because
  // this profile has none of the demo records the fixture cites
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(
    page.getByRole("button", { name: "Edit bullet 1 of Example Workshop" }),
  ).toBeVisible();
  await expect(page.getByText("Cites a record that is not in the snapshot").first()).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Materials" }).getByText("Needs review", { exact: true }),
  ).toBeVisible();

  // The Jobs list derives Needs review from the unreviewed draft
  await page.goto("/jobs");
  await expect(
    page.getByRole("list", { name: "Jobs" }).getByText("Needs review", { exact: true }),
  ).toBeVisible();

  // Inline editing saves a new revision
  await page.goto(`${jobUrl}/resume`);
  await page.getByRole("button", { name: "Edit bullet 1 of Example Workshop" }).click();
  await page
    .getByLabel("Text of bullet 1 of Example Workshop")
    .fill("Built a PostgreSQL-backed reporting tool for weekly reports.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit bullet 1 of Example Workshop" })).toHaveText(
    "Built a PostgreSQL-backed reporting tool for weekly reports.",
  );

  // Reviewed is a person's decision; the card shows it
  await page.getByRole("button", { name: "Approve?", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeVisible();
  await expect(materials.getByText("Approved", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: "Approved", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("link", { name: "Download PDF", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Resume details" })
      .getByRole("link", { name: "Evidence", exact: true }),
  ).toHaveCSS("text-decoration-line", "underline");
  // Approval can be removed, and a new edited revision starts unapproved.
  await page.getByRole("button", { name: "Approved", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve?", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Approve?", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit bullet 1 of Example Workshop" }).click();
  await page
    .getByLabel("Text of bullet 1 of Example Workshop")
    .fill("Built a reporting tool with accessible filters.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve?", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["dark", "light"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await expect(page.getByRole("link", { name: "Download PDF", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts-test/document-mobile-${theme}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  // Every call is a run
  await page.goto(`${jobUrl}/resume/runs`);
  const runs = page.getByRole("table", { name: "Runs" });
  await expect(runs.getByRole("row")).toHaveCount(2);
  await expect(runs.getByRole("cell", { name: /fake/ })).toBeVisible();

  // The resume downloads as a one-page PDF rendered from the saved revision
  const pdf = await page.request.get(`${jobUrl}/resume/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // Paste back needs no provider at all
  await page.goto(`${jobUrl}/cover-letter/paste`);
  await expect(page.getByLabel("The prompt")).toContainText("BEGIN JOB POSTING");
  const answer = readFileSync("examples/generation/fixtures/cover-letter.json", "utf8");
  await page.getByLabel("The model's answer").fill(answer);
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page).toHaveURL(/\/cover-letter$/);
  await expect(page.getByText("Dear hiring team")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit paragraph 1" })).toBeVisible();

  // The settings column names the test double and never a key
  await page.goto("/settings/model");
  await expect(page.getByText("Test double", { exact: false }).first()).toBeVisible();

  // Deleting the job removes its documents and runs with it; the specs share one database
  await page.goto(jobUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByText("No jobs yet.")).toBeVisible();
});
