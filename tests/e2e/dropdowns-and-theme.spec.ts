import { expect, test } from "@playwright/test";

import { signInAsDemoAdmin } from "./auth";

test.describe("dropdowns and theme", () => {
  test("dropdown esc closes and does not keep focus", async ({ page }) => {
    await signInAsDemoAdmin(page);

    const teamSelectTrigger = page.locator('header [aria-haspopup="listbox"]').first();
    await expect(teamSelectTrigger).toBeVisible();

    await teamSelectTrigger.click();
    await page.keyboard.press("Escape");
    await expect(teamSelectTrigger).not.toBeFocused();

    const userMenuSummary = page.locator("#user-menu-dropdown > summary");
    await userMenuSummary.click();
    await expect(page.locator("#user-menu-dropdown")).toHaveAttribute("open", "");

    await page.keyboard.press("Escape");
    await expect(userMenuSummary).not.toBeFocused();
    await expect(page.locator("#user-menu-dropdown")).not.toHaveAttribute("open", "");
  });

  test("theme toggle persists after reload", async ({ page }) => {
    await signInAsDemoAdmin(page);

    const html = page.locator("html");
    const initialTheme = (await html.getAttribute("data-theme")) ?? "light";

    await page.locator("#user-menu-dropdown > summary").click();
    const switchControl = page.getByRole("switch", { name: "Theme" });
    await expect(switchControl).toBeVisible();
    await switchControl.click();

    const toggledTheme = (await html.getAttribute("data-theme")) ?? "light";
    expect(toggledTheme).not.toBe(initialTheme);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", toggledTheme);
  });
});
