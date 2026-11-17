import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("phone: navigation drawer, calendar creation, and no sideways scrolling", async ({ page }) => {
  await signUp(page, "Pat Phone");

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog", { name: "Navigation" }).getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar$/);

  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Title").fill("Phone event");
  await dialog.getByRole("button", { name: "Add event" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: /\(today\), 1 item/ })).toBeVisible();

  for (const path of ["/dashboard", "/planner", "/calendar", "/calendar?view=week", "/tasks", "/journal", "/mood", "/fitness", "/settings", "/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});
