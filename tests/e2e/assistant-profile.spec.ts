import { randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { expect, test } from "@playwright/test";

// Playwright owns port 3417 and landed_test. Verify the server before using mutation tools.
test("assistant profile writes appear in About me and stale edits are refused", async ({
  page,
}) => {
  await page.goto("/settings/model");
  await expect(page.getByRole("heading", { name: "Test double", exact: true })).toBeVisible();
  const client = new Client({ name: "profile-browser-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      requestInit: { headers: { Authorization: "Bearer test-token-test-token-test-token" } },
    }),
  );
  type Row = { id: string; updated_at: string; display_name: string };
  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError).not.toBe(true);
    const text = (result.content as { text: string }[])[0]!.text;
    return JSON.parse(text) as { profile?: Row | null; record: Row; deleted?: boolean };
  }
  try {
    const current = await call("get_profile", { sections: ["profile"] });
    if (!current.profile)
      await call("create_profile", { profile_id: randomUUID(), display_name: "Alex Rivera" });
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(26);
    expect(tools.some((tool) => tool.name === "delete_profile")).toBe(false);
    const created = (
      await call("add_skill", {
        record_id: randomUUID(),
        display_name: "MCP example skill",
        category: "Testing",
      })
    ).record;
    await page.goto("/about/skills");
    await expect(page.getByRole("link", { name: /MCP example skill/ })).toBeVisible();
    const updated = (
      await call("update_skill", {
        record_id: created.id,
        expected_updated_at: created.updated_at,
        changes: { display_name: "Updated MCP example skill" },
      })
    ).record;
    const stale = await client.callTool({
      name: "delete_skill",
      arguments: { record_id: created.id, expected_updated_at: created.updated_at },
    });
    expect(stale.isError).toBe(true);
    await page.reload();
    await expect(page.getByRole("link", { name: /Updated MCP example skill/ })).toBeVisible();
    await call("delete_skill", { record_id: updated.id, expected_updated_at: updated.updated_at });
    await page.reload();
    await expect(page.getByRole("link", { name: /Updated MCP example skill/ })).toHaveCount(0);
  } finally {
    await client.close();
  }
});
