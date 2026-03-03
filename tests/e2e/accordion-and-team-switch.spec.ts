import { expect, test } from "@playwright/test";

import { signInAsDemoAdmin } from "./auth";

test.describe("accordion persistence and team switching", () => {
  test("accordion hide action syncs persisted preference", async ({ page }) => {
    await signInAsDemoAdmin(page);

    const accordionToggle = page
      .locator("section")
      .filter({ hasText: "Recent Deploys" })
      .first()
      .locator("button[aria-expanded]")
      .first();

    await expect(accordionToggle).toBeVisible();
    const initialExpanded = (await accordionToggle.getAttribute("aria-expanded")) === "true";

    const preferenceSyncPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/account/ui-preferences") &&
        response.request().method() === "PATCH",
    );
    await accordionToggle.click();
    const preferenceSync = await preferenceSyncPromise;
    expect(preferenceSync.status()).toBeLessThan(500);
    expect(preferenceSync.request().postDataJSON()).toMatchObject({
      preferenceKey: expect.any(String),
      isOpen: !initialExpanded,
    });
  });

  test("team switcher posts active team update request", async ({ page }) => {
    await signInAsDemoAdmin(page);

    const teamSelectTrigger = page.locator("header label").filter({ hasText: "TM" }).locator('[aria-haspopup="listbox"]');
    await expect(teamSelectTrigger).toBeVisible();

    await teamSelectTrigger.click();

    const options = page.locator('ul[role="listbox"] button[role="option"]:not([disabled])');
    const optionCount = await options.count();
    test.skip(optionCount < 2, "Need at least 2 team options for this assertion");

    const targetIndex = 1;
    const updateRequest = page.waitForRequest(
      (request) => request.url().includes("/api/account/active-team") && request.method() === "POST",
    );
    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/account/active-team") &&
        response.request().method() === "POST",
    );

    await options.nth(targetIndex).click();
    const request = await updateRequest;
    const response = await updateResponse;

    expect(request.postDataJSON()).toMatchObject({ teamId: expect.any(String) });
    expect(response.status()).toBeLessThan(500);
  });
});
