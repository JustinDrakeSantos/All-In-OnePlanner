import { expect, test } from "@playwright/test";

/**
 * Visual review: captures every page for the seeded demo account.
 * Run with SCREENSHOTS=1 npx playwright test screenshots
 * Images land in test-results/screens/.
 */
test.skip(!process.env.SCREENSHOTS, "Set SCREENSHOTS=1 to capture review screenshots.");

const PAGES = [
  ["landing", "/"],
  ["dashboard", "/dashboard"],
  ["planner", "/planner"],
  ["calendar-month", "/calendar"],
  ["calendar-week", "/calendar?view=week"],
  ["tasks", "/tasks"],
  ["journal", "/journal"],
  ["mood", "/mood"],
  ["fitness", "/fitness"],
  ["fitness-health", "/fitness?tab=health"],
  ["fitness-habits", "/fitness?tab=habits"],
  ["settings", "/settings"],
] as const;

test("capture pages", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const [name, path] of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-${name}.png`, fullPage: true });
  }
  await page.emulateMedia({ colorScheme: "dark" });
  for (const [name, path] of [["dashboard", "/dashboard"], ["calendar-week", "/calendar?view=week"]] as const) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-dark-${name}.png`, fullPage: true });
  }
});
