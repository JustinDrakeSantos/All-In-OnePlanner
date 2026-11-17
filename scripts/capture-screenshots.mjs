// Captures the landing-page screenshots from a running production server.
//
//   npm run build
//   DATABASE_URL=file:./data/shots.db npm run db:migrate && DATABASE_URL=file:./data/shots.db npm run db:seed
//   DATABASE_URL=file:./data/shots.db npx next start -p 3200
//   npm run screenshots            (BASE_URL defaults to http://localhost:3200)
//
// Writes public/screenshots/<page>-<light|dark>.webp. Uses the installed Microsoft Edge.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = path.resolve("public/screenshots");
const PAGES = [
  ["dashboard", "/dashboard"],
  ["planner", "/planner"],
  ["calendar", "/calendar?view=week"],
  ["tasks", "/tasks"],
  ["journal", "/journal"],
  ["mood", "/mood"],
  ["fitness", "/fitness?tab=health"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    timezoneId: "America/Los_Angeles",
  });
  const page = await context.newPage();
  // Keep reminder pop-ups out of the pictures.
  await page.route("**/api/reminders", (route) => route.fulfill({ json: { reminders: [] } }));

  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");

  for (const [name, url] of PAGES) {
    await page.goto(`${BASE_URL}${url}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    const png = await page.screenshot();
    const file = path.join(OUT, `${name}-${theme}.webp`);
    await sharp(png).webp({ quality: 82 }).toFile(file);
    console.log("saved", path.relative(process.cwd(), file));
  }
  await context.close();
}

await browser.close();
