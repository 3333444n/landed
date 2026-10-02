import { expect, test } from "@playwright/test";

test("Settings leads to Connect your assistant, whose blocks start Landed over stdio", async ({
  page,
}) => {
  await page.goto("/");
  if (await page.getByLabel("Your name").isVisible()) {
    await page.getByLabel("Your name").fill("Alex Rivera");
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByRole("heading", { name: "Alex Rivera" })).toBeVisible();
  }

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(page).toHaveURL(/\/settings$/);
  const cards = page.getByRole("list", { name: "Settings" });
  await expect(cards.getByRole("link", { name: /Model setup/ })).toBeVisible();

  await cards.getByRole("link", { name: /Connect your assistant/ }).click();
  await expect(page).toHaveURL(/\/settings\/assistant$/);
  // Outside the desktop app the blocks run the checkout's `pnpm mcp`.
  await expect(page.getByLabel("Block for Claude Code")).toHaveValue(
    /^claude mcp add --scope user landed -- pnpm --silent --dir .+ mcp$/,
  );
  await expect(page.getByLabel("Block for Codex")).toHaveValue(/^codex mcp add landed -- pnpm /);
  await expect(page.getByLabel("Block for Claude Desktop")).toHaveValue(/"command": "pnpm"/);

  // The back link names the hub (CSS hides it while the hub is visible beside the column)
  await expect(page.locator('a[aria-label="Settings"][href="/settings"]')).toHaveCount(1);
});

test("the host guard refuses a foreign host", async ({ request }) => {
  const foreign = await request.get("/", { headers: { Host: "evil.example" } });
  expect(foreign.status()).toBe(403);
});
