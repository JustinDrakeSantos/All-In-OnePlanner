import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build (`npm run build` first).
 * They use the locally installed Microsoft Edge, so no browser download is
 * needed, and a throwaway database at data/e2e.db.
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    channel: "msedge",
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "msedge" }, testMatch: /(mobile|screenshots)\.spec\.ts/ },
  ],
  webServer: {
    command: `node -e "require('fs').rmSync('data/e2e.db',{force:true})" && npm run db:migrate && npm run db:seed && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { DATABASE_URL: "file:./data/e2e.db", APP_URL: BASE_URL },
  },
});
