import { expect, test } from "@playwright/test";

test("saved theme and palette survive navigation and reload without script warnings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ colorScheme: "light" });
  // Settings is independent of profile creation; this journey never writes career data.
  await page.goto("/settings");
  await page.getByRole("button", { name: "Switch between light and dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.goto("/settings?palette=steel");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-palette", "steel");
  await page.getByRole("link", { name: /Model setup/ }).click();
  await expect(page).toHaveURL(/\/settings\/model$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-palette", "steel");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-palette", "steel");

  await page.goto("/settings?palette=");
  await expect(page.locator("html")).not.toHaveAttribute("data-palette");
  expect(await page.evaluate(() => localStorage.getItem("landed-palette"))).toBeNull();
  expect(errors).toEqual([]);
});
