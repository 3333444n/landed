import { expect, test } from "@playwright/test";

// The token playwright.config.ts hands the server; the Connect column prints it inside the blocks.
const token = "test-token-test-token-test-token";
const port = 3417;

test("Settings leads to Connect your assistant, whose block names this server and the token", async ({
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
  await expect(cards.getByText("Token ends in ····oken")).toBeVisible();

  await cards.getByRole("link", { name: /Connect your assistant/ }).click();
  await expect(page).toHaveURL(/\/settings\/assistant$/);
  const block = page.getByLabel("Block for Claude Code");
  await expect(block).toHaveValue(
    `claude mcp add --transport http --scope user landed http://127.0.0.1:${port}/mcp --header "Authorization: Bearer ${token}"`,
  );
  await expect(page.getByLabel("Block for Codex")).toHaveValue(
    /--bearer-token-env-var LANDED_MCP_TOKEN$/,
  );
  await expect(page.getByLabel("Block for Claude Desktop")).toHaveValue(/mcp-remote/);

  // The back link names the hub (CSS hides it while the hub is visible beside the column)
  await expect(page.locator('a[aria-label="Settings"][href="/settings"]')).toHaveCount(1);
});

test("the endpoint answers the bearer, refuses without it and the host guard refuses a foreign host", async ({
  request,
}) => {
  const headers = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const initialize = await request.post("/mcp", {
    headers,
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "playwright", version: "0" },
      },
    },
  });
  expect(initialize.status()).toBe(200);
  expect(initialize.headers()["content-type"]).toContain("text/event-stream");

  const tools = await request.post("/mcp", {
    headers,
    data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  });
  expect(tools.status()).toBe(200);
  expect(tools.headers()["content-type"]).toContain("text/event-stream");
  expect(await tools.text()).toContain("list_jobs");

  const unauthorized = await request.post("/mcp", {
    headers: { Accept: headers.Accept, "Content-Type": headers["Content-Type"] },
    data: { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
  });
  expect(unauthorized.status()).toBe(401);

  const foreign = await request.get("/", { headers: { Host: "evil.example" } });
  expect(foreign.status()).toBe(403);
});
