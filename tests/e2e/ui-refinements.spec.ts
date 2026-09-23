import { randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { expect, test } from "@playwright/test";

// Mutations and screenshots use only Playwright's isolated fictional database and fake adapter.
test("browse nested facts, edit role pills, and filter direct and derived skill contexts", async ({
  page,
}) => {
  await page.goto("/settings/model");
  await expect(page.getByRole("heading", { name: "Test double", exact: true })).toBeVisible();
  const client = new Client({ name: "ui-refinement-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      requestInit: { headers: { Authorization: "Bearer test-token-test-token-test-token" } },
    }),
  );
  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError).not.toBe(true);
    return JSON.parse((result.content as { text: string }[])[0]!.text) as {
      record: { id: string };
    };
  }
  try {
    const role = (
      await call("add_role", {
        record_id: randomUUID(),
        employer_name: "Example Studio",
        role: "UI verification role",
        description: "Built accessible catalogues.",
      })
    ).record;
    const project = (
      await call("add_project", {
        record_id: randomUUID(),
        name: "UI verification project",
        role_id: role.id,
      })
    ).record;
    const other = (
      await call("add_project", { record_id: randomUUID(), name: "Unrelated verification project" })
    ).record;
    const derived = (
      await call("add_skill", {
        record_id: randomUUID(),
        display_name: "Evidence-only verification skill",
      })
    ).record;
    await call("add_achievement", {
      record_id: randomUUID(),
      statement: "Verified keyboard navigation in a fictional catalogue.",
      project_id: project.id,
      skill_ids: [derived.id],
    });

    await page.goto("/about");
    const hub = page.getByRole("list", { name: "Profile", exact: true });
    const profile = hub.locator(":scope > li").first();
    await profile.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(profile.locator("details")).toHaveAttribute("open", "");
    await expect(profile.getByText("Name", { exact: true })).toBeVisible();
    await expect(hub.getByText(/^Manage /)).toHaveCount(0);
    const work = hub
      .locator(":scope > li")
      .filter({ has: page.getByRole("heading", { name: "Work history", exact: true }) });
    await work.locator("summary").first().click();
    await expect(profile.locator("details")).toHaveAttribute("open", "");
    const nestedRole = work
      .locator("details")
      .filter({ has: page.getByRole("heading", { name: "UI verification role", exact: true }) })
      .last();
    await nestedRole.locator("summary").click();
    await expect(nestedRole.getByText("Built accessible catalogues.")).toBeVisible();
    await expect(page).toHaveURL(/\/about$/);
    await profile.getByRole("link", { name: "Edit General info", exact: true }).click();
    await expect(page).toHaveURL(/\/about\/profile$/);

    const desired = page.getByLabel("Desired roles", { exact: true });
    await desired.fill("Interface engineer");
    await desired.press("Enter");
    await desired.fill("interface engineer");
    await desired.press("Enter");
    await expect(
      page.getByRole("button", { name: "Remove Interface engineer", exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Remove Interface engineer", exact: true }),
    ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await desired.fill("Temporary role");
    await desired.press("Enter");
    await page.getByRole("button", { name: "Remove Temporary role", exact: true }).click();
    await page.getByLabel("Your name", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save general info", exact: true }).click();
    await expect(page.getByLabel("Your name", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Remove Interface engineer", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove Temporary role", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Your name", { exact: true }).fill("Alex Rivera");
    await desired.fill("Draft role saved without Add");
    await page.getByRole("button", { name: "Save general info", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Remove Draft role saved without Add", exact: true }),
    ).toBeVisible();

    await page.setViewportSize({ width: 320, height: 800 });
    await desired.scrollIntoViewIfNeeded();
    const pillInputBox = await desired.boundingBox();
    const addBox = await page.getByRole("button", { name: "Add", exact: true }).boundingBox();
    expect(pillInputBox!.width).toBeGreaterThan(40);
    expect(addBox!.x + addBox!.width).toBeLessThanOrEqual(320);
    await page.screenshot({
      path: "artifacts-test/profile-pills-mobile.png",
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto("/about/skills/new");
    await page.getByLabel("Skill", { exact: true }).fill("Direct verification skill");
    await page
      .getByRole("combobox", { name: "Linked roles", exact: true })
      .fill("UI verification role");
    await page
      .getByRole("option", { name: "UI verification role at Example Studio", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("combobox", { name: "Linked projects", exact: true })
      .fill("UI verification project");
    await page.getByRole("option", { name: "UI verification project", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByLabel("Skill", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save skill", exact: true }).click();
    await expect(page.getByLabel("Skill", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('input[name="employmentIds"]')).toHaveCount(1);
    await expect(page.locator('input[name="projectIds"]')).toHaveCount(1);
    await page.getByLabel("Skill", { exact: true }).fill("Direct verification skill");
    await page.getByRole("button", { name: "Save skill", exact: true }).click();
    await expect(page).toHaveURL(/\/about\/skills\/[0-9a-f-]+$/);
    const skillUrl = page.url();
    await page.reload();
    await expect(page.locator('input[name="employmentIds"]')).toHaveValue(role.id);
    await expect(page.locator('input[name="projectIds"]')).toHaveValue(project.id);

    await page.goto("/about/skills");
    await page
      .getByRole("region", { name: /^Skills/ })
      .getByLabel("Filter skills", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "UI verification role at Example Studio", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`skillsRole=${role.id}`));
    const skills = page.getByRole("list", { name: "Skills", exact: true });
    await expect(
      skills.getByRole("heading", { name: "Direct verification skill", exact: true }),
    ).toBeVisible();
    await expect(
      skills.getByRole("heading", { name: "Evidence-only verification skill", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Unrelated verification project", exact: true }).click();
    await expect(
      page
        .getByRole("paragraph")
        .filter({ hasText: "No matches. Change or clear the filters." })
        .filter({ visible: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "UI verification project", exact: true }).click();
    await expect(
      skills.getByRole("heading", { name: "Direct verification skill", exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.getAll("skillsProject")).toEqual([
      other.id,
      project.id,
    ]);
    await page.reload();
    await page
      .getByRole("region", { name: /^Skills/ })
      .getByLabel("Filter skills", { exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "UI verification project", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "No role", exact: true }).click();
    await expect(page.getByRole("button", { name: "No role", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(new URL(page.url()).searchParams.getAll("skillsRole")).toEqual([role.id, "none"]);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts-test/filter-chips-mobile-${theme}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page).toHaveURL(/\/about\/skills$/);
    await page.goto(`/about/skills?skillsProject=${project.id}`);
    await skills.getByRole("link", { name: "Edit Direct verification skill", exact: true }).click();
    await expect(page).toHaveURL(`${skillUrl}?skillsProject=${project.id}`);

    // Filter state survives the mobile parent link and creating/deleting a record.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("link", { name: "Skills", exact: true }).click();
    await expect(page).toHaveURL(`/about/skills?skillsProject=${project.id}`);
    await page.getByRole("link", { name: "Add skill", exact: true }).click();
    await expect(page).toHaveURL(`/about/skills/new?skillsProject=${project.id}`);
    await page.getByLabel("Skill", { exact: true }).fill("Temporary context verification skill");
    await page.getByRole("button", { name: "Save skill", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/about/skills/[0-9a-f-]+\\?skillsProject=${project.id}$`),
    );
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(page).toHaveURL(`/about/skills?skillsProject=${project.id}`);
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto(`/about/achievements?achievementsRole=${role.id}`);
    const achievements = page.getByRole("list", { name: "Achievements", exact: true });
    await expect(
      achievements.getByRole("heading", {
        name: "Verified keyboard navigation in a fictional catalogue.",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(achievements.getByRole("listitem")).toHaveCount(1);
    await page.goto(`/about/achievements?achievementsProject=${other.id}`);
    await expect(
      page
        .getByRole("paragraph")
        .filter({ hasText: "No matches. Change or clear the filters." })
        .filter({ visible: true }),
    ).toBeVisible();

    // Small screens keep controls and nested cards inside the viewport in both themes.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/about");
    await work.locator("summary").first().click();
    await hub
      .locator(":scope > li")
      .filter({ has: page.getByRole("heading", { name: "Skills", exact: true }) })
      .locator("summary")
      .first()
      .click();
    await expect(
      work.getByRole("heading", { name: "UI verification role", exact: true }),
    ).toBeVisible();
    for (const theme of ["dark", "light"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts-test/about-mobile-${theme}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: "artifacts-test/about-desktop-light.png",
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await client.close();
  }
});
