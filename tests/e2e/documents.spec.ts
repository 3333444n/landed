import { createJobCompany } from "./company-helpers";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Values from examples/demo-profile.json (fictional). The server runs the fake model adapter,
// which answers from examples/generation/fixtures.
const demo = {
  displayName: "Alex Rivera",
  title: "Full-stack developer",
  companyName: "Example Analytics",
  rawDescription:
    "Example Analytics is looking for a full-stack developer to build internal reporting tools.\n\nYou will work with PostgreSQL and TypeScript.",
};

// The editor moves the cursor to the end once mounted, which can race fill's select-all, so
// retry until the field holds exactly the new text.
async function fillEditor(page: Page, label: string, text: string) {
  const editor = page.getByLabel(`Text of ${label}`, { exact: true });
  await expect(editor).toBeFocused();
  await expect(async () => {
    if (text) await editor.fill(text);
    else {
      await editor.press("ControlOrMeta+a");
      await editor.press("Backspace");
    }
    await expect(editor).toHaveText(text, { timeout: 500 });
  }).toPass();
}

async function editText(page: Page, label: string, text: string, newLabel = label) {
  await page.getByRole("button", { name: `Edit ${label}`, exact: true }).click();
  await fillEditor(page, label, text);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: `Edit ${newLabel}`, exact: true })).toBeVisible();
}

// Clean up this journey's job even when an assertion fails, so later journeys
// can still exercise their empty states against the shared test database.
let createdJobUrl: string | undefined;
test.afterEach(async ({ page }) => {
  if (!createdJobUrl) return;
  await page.goto(createdJobUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page).toHaveURL(/\/jobs$/);
  createdJobUrl = undefined;
});

function editorError(page: Page, label: string) {
  return page
    .locator("form")
    .filter({ has: page.getByLabel(`Text of ${label}`, { exact: true }) })
    .getByRole("alert");
}

test("a document is generated, reviewed in place, and another is pasted back", async ({ page }) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill(demo.displayName);
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByRole("heading", { name: demo.displayName })).toBeVisible();
  }

  // Saved links keep their destinations while the letter shortens their visible labels.
  await page.goto("/about/profile");
  await page.getByLabel("Website", { exact: true }).fill("https://www.example.com/");
  await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
  await page.getByLabel("Location", { exact: true }).fill("Example City");
  const defaults = page.getByRole("group", { name: "Resume contact defaults", exact: true });
  for (const label of ["Phone", "Email", "Location", "LinkedIn", "GitHub"])
    await defaults.getByRole("checkbox", { name: `Show ${label}`, exact: true }).check();
  await defaults.getByRole("checkbox", { name: "Show Website", exact: true }).uncheck();
  await page.getByRole("button", { name: "Save general info", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/jobs/new");
  await page.getByLabel("Title").fill(demo.title);
  await createJobCompany(page, demo.companyName);
  await page.getByLabel("Description").fill(demo.rawDescription);
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
  const jobUrl = page.url();
  createdJobUrl = jobUrl;

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

  // Contact controls select snapshot facts, preserve their order, and explicitly restore defaults.
  await page.goto(`${jobUrl}/resume`);
  const contactRow = page.getByLabel("Resume contact row", { exact: true });
  await expect(contactRow).toContainText("Example City");
  await expect(contactRow.getByRole("link", { name: "example.com", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Resume contact row", exact: true }).click();
  const contacts = page.getByRole("group", { name: "Resume contact details", exact: true });
  await contacts.getByRole("checkbox", { name: "Show Location", exact: true }).uncheck();
  await contacts.getByRole("checkbox", { name: "Show Website", exact: true }).check();
  for (let i = 0; i < 4; i++)
    await contacts.getByRole("button", { name: "Move Website up", exact: true }).click();
  await page.getByRole("button", { name: "Save contact row", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume contact row", exact: true })).toBeVisible();
  await expect(contactRow).not.toContainText("Example City");
  await expect(contactRow).toHaveText(/^example\.com/);
  await expect(contactRow.getByRole("link")).toHaveCount(0);
  await page.reload();
  await expect(contactRow).toHaveText(/^example\.com/);
  await page.getByRole("button", { name: "Resume contact row", exact: true }).click();
  await expect(
    page
      .getByLabel("Contact links", { exact: true })
      .getByRole("link", { name: "example.com", exact: true }),
  ).toHaveAttribute("href", "https://www.example.com/");
  await page.getByRole("button", { name: "Apply profile default", exact: true }).click();
  await expect(
    contacts.getByRole("checkbox", { name: "Show Location", exact: true }),
  ).toBeChecked();
  await expect(
    contacts.getByRole("checkbox", { name: "Show Website", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Save contact row", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume contact row", exact: true })).toBeVisible();
  await expect(contactRow).toContainText("Example City");
  await expect(contactRow.getByRole("link", { name: "example.com", exact: true })).toHaveCount(0);

  // Inline editing saves a new revision
  await page.getByRole("button", { name: "Edit bullet 1 of Example Workshop" }).click();
  await fillEditor(
    page,
    "bullet 1 of Example Workshop",
    "Built a PostgreSQL-backed reporting tool for weekly reports.",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit bullet 1 of Example Workshop" })).toHaveText(
    "Built a PostgreSQL-backed reporting tool for weekly reports.",
  );

  // Newly editable fields keep their distinct type hierarchy and survive a reload.
  await editText(page, "headline", "Accessible software developer");
  await editText(page, "subtitle of Example Workshop", "Full-stack developer");
  await editText(page, "subtitle of Community Tool Library", "TypeScript and accessible forms");
  await editText(page, "skills of Technical", "TypeScript, PostgreSQL");
  await editText(page, "skill group of Technical", "Engineering", "skill group of Engineering");
  await editText(page, "subtitle of Example Learning Institute", "Software certificate");
  await editText(page, "dates of Example Learning Institute", "2022");
  await editText(page, "location of Example Learning Institute", "Online");
  await editText(
    page,
    "institution of Example Learning Institute",
    "Example Institute",
    "institution of Example Institute",
  );
  await page.reload();
  for (const [label, value] of [
    ["headline", "Accessible software developer"],
    ["subtitle of Example Workshop", "Full-stack developer"],
    ["subtitle of Community Tool Library", "TypeScript and accessible forms"],
    ["skills of Engineering", "TypeScript, PostgreSQL"],
    ["skill group of Engineering", "Engineering"],
    ["subtitle of Example Institute", "Software certificate"],
    ["dates of Example Institute", "2022"],
    ["location of Example Institute", "Online"],
    ["institution of Example Institute", "Example Institute"],
  ] as const)
    await expect(page.getByRole("button", { name: `Edit ${label}`, exact: true })).toHaveText(
      value,
    );
  await expect(
    page.getByRole("button", { name: "Edit subtitle of Example Workshop", exact: true }),
  ).toHaveCSS("font-size", "13px");

  // Blank optional text becomes an Add control, and can be restored with keyboard activation.
  await editText(page, "headline", "");
  const headline = page.getByRole("button", { name: "Edit headline", exact: true });
  await expect(headline).toHaveText("Add headline");
  await headline.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Text of headline", { exact: true })).toBeFocused();
  await fillEditor(page, "headline", "x".repeat(121));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editorError(page, "headline")).toBeVisible();
  await expect(page.getByLabel("Text of headline", { exact: true })).toHaveText("x".repeat(121));
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(headline).toHaveText("Add headline");
  await editText(page, "headline", "Software developer");

  // A second tab retains its unsaved value when a newer revision wins.
  const oldTab = await page.context().newPage();
  await oldTab.goto(`${jobUrl}/resume`);
  await oldTab.getByRole("button", { name: "Edit headline", exact: true }).click();
  await fillEditor(oldTab, "headline", "Text from the older tab");
  await oldTab.getByLabel("Text of headline", { exact: true }).press("ControlOrMeta+a");
  await oldTab
    .getByRole("group", { name: "Selection formatting", exact: true })
    .getByRole("button", { name: "Italic", exact: true })
    .click();
  await editText(page, "headline", "Updated software developer");
  await oldTab.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editorError(oldTab, "headline")).toHaveText(
    "This record changed since you opened it. Reload to see the latest version.",
  );
  await expect(oldTab.getByLabel("Text of headline", { exact: true })).toHaveText(
    "Text from the older tab",
  );
  await expect(oldTab.getByLabel("Text of headline", { exact: true }).locator("em")).toHaveText(
    "Text from the older tab",
  );
  await oldTab.close();

  // Visual formatting survives save and reload; clearing changes marks, never the words.
  await page.getByRole("button", { name: "Edit headline", exact: true }).click();
  const formattedEditor = page.getByLabel("Text of headline", { exact: true });
  await expect(page.getByRole("group", { name: "Text formatting", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Selection formatting", exact: true }),
  ).not.toBeVisible();
  await formattedEditor.press("ControlOrMeta+a");
  await expect(
    page.getByRole("group", { name: "Selection formatting", exact: true }),
  ).toBeVisible();
  const formatControls = page.getByRole("group", { name: "Selection formatting", exact: true });
  await formatControls.getByRole("button", { name: "Bold", exact: true }).click();
  await formatControls.getByRole("button", { name: "Underline", exact: true }).click();
  await expect(formattedEditor.locator("strong")).toHaveText("Updated software developer");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(headline.locator("strong")).toHaveText("Updated software developer");
  await page.reload();
  await expect(headline.locator("u")).toHaveText("Updated software developer");
  await headline.click();
  await formattedEditor.press("ControlOrMeta+a");
  await formatControls.getByRole("button", { name: "Clear formatting", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(headline).toHaveText("Updated software developer");
  await expect(headline.locator("strong, em, u")).toHaveCount(0);

  // HTML paste retains only supported marks; link destinations and arbitrary styles are discarded.
  await headline.click();
  await formattedEditor.press("ControlOrMeta+a");
  await formattedEditor.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "Updated software developer");
    clipboardData.setData(
      "text/html",
      '<p><strong>Updated</strong> <a href="https://example.com"><em>software</em></a> <span style="color:red;font-size:48px"><u>developer</u></span></p>',
    );
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }),
    );
  });
  await expect(formattedEditor.locator("strong")).toHaveText("Updated");
  await expect(formattedEditor.locator("em")).toHaveText("software");
  await expect(formattedEditor.locator("u")).toHaveText("developer");
  await expect(formattedEditor.locator("a, [style], img")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(headline.locator("strong")).toHaveText("Updated");

  // Clearing inline marks keeps the template's already-bold heading style.
  await page.getByRole("button", { name: "Edit skill group of Engineering", exact: true }).click();
  const headingEditor = page.getByLabel("Text of skill group of Engineering", { exact: true });
  await expect(headingEditor).toHaveCSS("font-weight", "600");
  await headingEditor.press("ControlOrMeta+a");
  await formatControls.getByRole("button", { name: "Italic", exact: true }).click();
  await formatControls.getByRole("button", { name: "Clear formatting", exact: true }).click();
  await expect(headingEditor.locator("strong, em, u")).toHaveCount(0);
  await expect(headingEditor).toHaveCSS("font-weight", "600");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

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
  await fillEditor(
    page,
    "bullet 1 of Example Workshop",
    "Built a reporting tool with accessible filters.",
  );
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

  await editText(page, "professional title", "Software developer");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit professional title", exact: true }),
  ).toHaveText("Software developer");
  await editText(page, "professional title", "");
  await expect(
    page.getByRole("button", { name: "Edit professional title", exact: true }),
  ).toHaveText("Add professional title");
  await editText(page, "professional title", "Software developer");
  await editText(page, "greeting", "Dear team,,");
  await editText(page, "closing", "Best regards,,");
  await editText(page, "signature", "Alex R.");
  await page.reload();
  await expect(page.getByRole("button", { name: "Edit greeting", exact: true })).toHaveText(
    "Dear team,",
  );
  await expect(page.getByRole("button", { name: "Edit closing", exact: true })).toHaveText(
    "Best regards,",
  );
  await expect(page.getByRole("button", { name: "Edit signature", exact: true })).toHaveText(
    "Alex R.",
  );
  const letter = page.getByRole("article", { name: "Cover letter preview" });
  await expect(letter.getByRole("link", { name: "example.com", exact: true })).toHaveAttribute(
    "href",
    "https://www.example.com/",
  );
  await expect(letter.getByRole("link", { name: "example.com", exact: true })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(letter.getByText(demo.companyName, { exact: true })).toBeVisible();
  await expect(letter.getByText(demo.title, { exact: true })).toHaveCSS("font-style", "italic");
  await expect(letter.getByText("Job reference:", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Edit greeting", exact: true }).click();
  await page.getByLabel("Text of greeting", { exact: true }).press("ControlOrMeta+a");
  await page.getByLabel("Text of greeting", { exact: true }).press("Backspace");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editorError(page, "greeting")).toBeVisible();
  await expect(page.getByLabel("Text of greeting", { exact: true })).toHaveText("");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await expect(letter).toBeVisible();
      expect(await letter.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts-test/letter-${width}-${theme}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  const letterPdf = await page.request.get(`${jobUrl}/cover-letter/pdf`);
  expect(letterPdf.status()).toBe(200);
  writeFileSync("artifacts-test/letter-review.pdf", await letterPdf.body());

  // The settings column names the test double and never a key
  await page.goto("/settings/model");
  await expect(page.getByText("Test double", { exact: false }).first()).toBeVisible();

  // Deleting the job removes its documents and runs with it; the specs share one database
  await page.goto(jobUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page).toHaveURL(/\/jobs$/);
  createdJobUrl = undefined;
  await expect(page.getByText("No jobs yet.")).toBeVisible();
});
