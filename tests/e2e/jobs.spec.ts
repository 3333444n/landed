import { createJobCompany } from "./company-helpers";
import { expect, test } from "@playwright/test";

// Values from examples/demo-profile.json (fictional).
const demo = {
  displayName: "Alex Rivera",
  title: "Full-stack developer",
  companyName: "Example Analytics",
  location: "Remote",
  salary: "$90k to $110k a year",
  rawDescription:
    "Example Analytics is looking for a full-stack developer to build internal reporting tools.\n\nYou will work with PostgreSQL and TypeScript.",
};

test("a pasted job gets an application whose status the user moves by hand", async ({ page }) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill(demo.displayName);
    await page.getByRole("button", { name: "Create profile" }).click();
  }

  // A skill the posting mentions, so the word cloud has a match to tint
  await page.goto("/about/skills/new");
  await page.getByLabel("Skill", { exact: true }).fill("PostgreSQL");
  await page.getByRole("button", { name: "Save skill" }).click();
  await expect(page.getByRole("list", { name: "Skills" }).getByText("PostgreSQL")).toBeVisible();

  // Empty state, then the paste form from the add control
  await page.goto("/jobs");
  await expect(page.getByText("No jobs yet.")).toBeVisible();
  await page.getByRole("link", { name: "Add job" }).click();
  await page.getByLabel("Title").fill(demo.title);
  await createJobCompany(page, demo.companyName);
  await page.getByLabel("Location").fill(demo.location);
  await page.getByLabel("Salary").fill(demo.salary);
  await page.getByLabel("Description").fill(demo.rawDescription);

  // The word cloud follows the description before anything is saved and tints the skill
  const liveCloud = page.getByRole("list", { name: "Frequent words" });
  await expect(
    liveCloud.getByRole("listitem").filter({ hasText: "postgresql, 1 time, in your skills" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save job" }).click();

  // The job opens beside the list with its Preparing chip and inert document blocks
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
  const jobUrl = page.url();
  const list = page.getByRole("list", { name: "Jobs" });
  await expect(list.getByRole("heading", { name: demo.title })).toBeVisible();
  await expect(list.getByText(demo.companyName, { exact: true })).toBeVisible();
  await expect(list.getByText(demo.salary, { exact: true })).toBeVisible();
  await expect(list.getByText("Preparing", { exact: true })).toBeVisible();
  const materials = page.getByRole("list", { name: "Materials" });
  await expect(materials.getByText("Not started")).toHaveCount(3);

  // The word cloud counts the posting's words and tints the one that is a skill
  const cloud = page.getByRole("list", { name: "Frequent words" });
  await expect(
    cloud.getByRole("listitem").filter({ hasText: "postgresql, 1 time, in your skills" }),
  ).toBeVisible();
  await expect(
    cloud.getByRole("listitem").filter({ hasText: /^typescript, 1 time$/ }),
  ).toBeVisible();

  // Manual status change survives a reload and shows the submission date
  await page.getByLabel("Status").selectOption("applied");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByText(/Marked as applied on/)).toBeVisible();

  // An applied job leaves the default Needs attention filter; filters read the address only
  await expect(page.getByText("Nothing under this filter.")).toBeVisible();
  const choose = async (menu: "Filter" | "Sort", option: string) => {
    await page.getByRole("button", { name: menu }).click();
    await page.getByRole("menuitemradio", { name: option }).click();
    await expect(page.getByRole("menu")).toBeHidden();
  };
  await choose("Filter", "Active");
  await expect(page).toHaveURL(/filter=active/);
  await expect(list.getByText("Applied", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Active" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("menuitemradio", { name: "Closed" }).click();
  await expect(page.getByText("Nothing under this filter.")).toBeVisible();
  await choose("Filter", "All");
  await expect(list.getByRole("heading", { name: demo.title })).toBeVisible();
  await choose("Sort", "Added");
  await expect(page).toHaveURL(/sort=added/);

  // Editing the posting in its own column updates the job column and the list
  await page.goto(jobUrl);
  await page.getByRole("link", { name: "Job description" }).click();
  await expect(page).toHaveURL(/\/description$/);
  await page.getByLabel("Title").fill("Senior full-stack developer");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await expect(page.getByRole("heading", { name: "Senior full-stack developer" })).toBeVisible();

  // The company owns its logo; linked jobs display it without a per-job override.
  await page.goto(jobUrl);
  const companyPath = await page.getByRole("list", {name:"Materials"}).getByRole("link").filter({hasText:/^Company/}).getAttribute("href");
  await page.goto(companyPath!);
  const companyVersion = page.locator('input[name="expectedUpdatedAt"]');
  let before = await companyVersion.inputValue();
  await page.getByLabel("Logo file").setInputFiles({name:"logo.png", mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==","base64")});
  await page.getByRole("button", {name:"Save changes",exact:true}).click();
  await expect(companyVersion).not.toHaveValue(before);
  await page.goto(`${jobUrl}?filter=all`);
  const logo = page.getByRole("list", { name: "Jobs" }).locator("img");
  await expect(logo).toHaveCount(1);
  await expect.poll(() => logo.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth)).toBe(1);
  const logoSrc = await logo.getAttribute("src");
  expect(logoSrc).toMatch(/^\/companies\//);
  const response = await page.request.get(logoSrc!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  expect(response.headers()["content-security-policy"]).toBe("sandbox");
  expect((await page.request.get(`${logoSrc?.split("?")[0]}?k=00000000`)).status()).toBe(404);
  await page.goto(companyPath!);
  before = await companyVersion.inputValue();
  await page.getByRole("button",{name:"Change logo"}).click();
  await page.getByRole("menuitem",{name:"Remove logo"}).click();
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(companyVersion).not.toHaveValue(before);
  await page.goto(`${jobUrl}?filter=all`);
  await expect(page.getByRole("list",{name:"Jobs"}).locator("img")).toHaveCount(0);

  await page.goto(jobUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByText("No jobs yet.")).toBeVisible();
});
