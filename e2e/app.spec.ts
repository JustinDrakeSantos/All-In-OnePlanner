import { expect, test } from "@playwright/test";
import { PASSWORD, browserToday, logIn, signUp, uniqueEmail } from "./helpers";

test("accounts: sign up, protected pages, log out, wrong password, log back in", async ({ page }) => {
  const email = await signUp(page, "Taylor Test");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Taylor");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/login\?next=%2Ftasks$/);

  // Stay on /login?next=%2Ftasks so the destination is carried through a failed attempt.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/tasks$/);
});

test("login: the eye button shows and hides the typed password", async ({ page }) => {
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  const toggle = page.getByRole("button", { name: "Show password" });

  await password.fill("my secret");
  await expect(password).toHaveAttribute("type", "password");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.hover();
  await expect(toggle).toHaveAttribute("title", "Show password");
  await toggle.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("my secret");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toHaveAttribute("title", "Hide password");

  await toggle.press("Enter");
  await expect(password).toHaveAttribute("type", "password");

  // The field hides itself again after a submit.
  await toggle.click();
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
});

test("signup validation keeps what was typed and explains the problem", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Sam");
  await page.getByLabel("Email").fill("sam@example");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("different");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Sam");
});

test("tasks: quick add, complete, edit, delete", async ({ page }) => {
  await signUp(page);
  await page.goto("/tasks");

  await page.getByLabel("New task").fill("Buy milk");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("button", { name: "Buy milk", exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: "Buy milk: mark as done" }).check();
  await expect(page.getByRole("button", { name: "Buy milk", exact: true })).toBeHidden();
  await page.goto("/tasks?view=completed");
  await expect(page.getByRole("button", { name: "Buy milk", exact: true })).toBeVisible();

  await page.goto("/tasks");
  await page.getByLabel("New task").fill("Write essay");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByRole("button", { name: "Edit “Write essay”" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit task" });
  await dialog.getByLabel("Title").fill("Write essay draft");
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("listitem").filter({ hasText: "Write essay draft" });
  await expect(row.getByText("High")).toBeVisible();

  await page.getByRole("button", { name: "Edit “Write essay draft”" }).click();
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Delete this task?" }).click();
  await expect(page.getByRole("button", { name: "Write essay draft", exact: true })).toBeHidden();
});

test("calendar: create, validate, switch views, edit, delete", async ({ page }) => {
  await signUp(page);
  await page.goto("/calendar");
  const today = await browserToday(page);

  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Title").fill("Team sync");
  await dialog.getByLabel("Date").fill(today);
  await dialog.getByLabel("Starts").fill("14:00");
  await dialog.getByLabel("Ends").fill("13:00");
  await dialog.getByRole("button", { name: "Add event" }).click();
  await expect(dialog.getByText("End time must be after the start time.")).toBeVisible();
  await expect(dialog.getByLabel("Title")).toHaveValue("Team sync");

  await dialog.getByLabel("Ends").fill("15:00");
  await dialog.getByRole("button", { name: "Add event" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /^Team sync, 2:00 PM – 3:00 PM/ })).toBeVisible();

  await page.getByRole("link", { name: "Week", exact: true }).click();
  await expect(page).toHaveURL(/view=week/);
  await page.getByRole("button", { name: /^Team sync, 2:00 PM – 3:00 PM/ }).click();
  const edit = page.getByRole("dialog", { name: "Edit event" });
  await edit.getByLabel("Title").fill("Team sync (moved)");
  await edit.getByLabel("Starts").fill("16:00");
  await edit.getByLabel("Ends").fill("17:30");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: /^Team sync \(moved\), 4:00 PM – 5:30 PM/ })).toBeVisible();

  await page.getByRole("link", { name: "Day", exact: true }).click();
  await expect(page).toHaveURL(/view=day/);
  await page.getByRole("button", { name: /^Team sync \(moved\)/ }).click();
  await page.getByRole("button", { name: "Delete event" }).click();
  await page.getByRole("button", { name: "Delete this event?" }).click();
  await expect(page.getByRole("button", { name: /^Team sync \(moved\)/ })).toBeHidden();
});

test("dashboard and daily planner share tasks and events", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("New task").fill("Morning pages");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("button", { name: "Morning pages", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Plan your day" }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("button", { name: "Morning pages", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Title").fill("Lunch with Sam");
  await dialog.getByLabel("Starts").fill("12:00");
  await dialog.getByLabel("Ends").fill("13:00");
  await dialog.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("button", { name: /Lunch with Sam/ })).toBeVisible();

  // The previous day is reachable and empty.
  await page.getByRole("link", { name: "Previous day" }).click();
  await expect(page.getByText("Nothing planned yet")).toBeVisible();
});

test("mood and journal: check in, write from a prompt, search, tag, edit", async ({ page }) => {
  await signUp(page);
  await page.goto("/mood");
  await page.getByText("Good", { exact: true }).click();
  await page.getByText("calm", { exact: true }).click();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText("Check-in saved.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Feeling good", { exact: true })).toBeVisible();

  await page.goto("/journal");
  await page.getByRole("link", { name: /^Write about:/ }).first().click();
  await expect(page).toHaveURL(/\/journal\/new\?kind=entry&prompt=/);
  await page.getByLabel("Title").fill("First entry");
  await page.getByLabel("Entry", { exact: true }).fill("Today I tested the planner from end to end.");
  await page.getByLabel("Tags").fill("Testing, e2e");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "First entry" })).toBeVisible();
  await expect(page.getByText("Mood that day: Good")).toBeVisible();

  await page.goto("/journal?q=end+to+end");
  await expect(page.getByRole("link", { name: /First entry/ })).toBeVisible();
  await page.goto("/journal?q=nonexistent");
  await expect(page.getByText("No entries match")).toBeVisible();
  await page.goto("/journal");
  await page.getByRole("complementary", { name: "Journal summary" }).getByRole("link", { name: /#testing/ }).click();
  await expect(page).toHaveURL(/tag=testing/);
  await page.getByRole("link", { name: /First entry/ }).click();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("First entry, revised");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "First entry, revised" })).toBeVisible();
});

test("fitness: water, habits, workouts, measurements", async ({ page }) => {
  await signUp(page);
  await page.goto("/fitness");
  await page.getByRole("button", { name: "+8 oz" }).click();
  await expect(page.getByRole("progressbar", { name: "Water toward today's goal" })).toHaveAttribute("aria-valuenow", "237");
  await page.getByRole("button", { name: "Undo last water entry" }).click();
  await expect(page.getByRole("progressbar", { name: "Water toward today's goal" })).toHaveAttribute("aria-valuenow", "0");

  await page.getByRole("link", { name: "Habits" }).click();
  await page.getByLabel("New habit").fill("Stretch");
  await page.getByRole("button", { name: "Add habit" }).click();
  const todayToggle = page.getByRole("button", { name: /^Stretch, .*: not done$/ }).last();
  await todayToggle.click();
  await expect(page.getByRole("button", { name: /^Stretch, .*: done$/ })).toHaveCount(1);

  await page.getByRole("link", { name: "Workouts" }).click();
  await page.getByRole("button", { name: "Save workout" }).click();
  await expect(page.getByText("Workout logged. Nice work!")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "30 min" }).filter({ hasText: "Moderate" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Weight, steps & sleep" }).click();
  // The date field is wide enough for the whole date, here and in the overview's half-width Steps card.
  const date = page.getByLabel("Date", { exact: true });
  const dateWidth = () => date.evaluate((el) => el.getBoundingClientRect().width);
  await expect(date).toBeVisible();
  await expect.poll(dateWidth).toBeGreaterThanOrEqual(170);
  await page.goto("/fitness");
  await expect(date).toBeVisible();
  await expect.poll(dateWidth).toBeGreaterThanOrEqual(170);
  await page.getByRole("link", { name: "Weight, steps & sleep" }).click();
  await expect(page.getByRole("heading", { name: "Log measurements" })).toBeVisible();
  await page.getByLabel("Weight (lb)").fill("160");
  await page.getByLabel("Steps", { exact: true }).fill("9000");
  await page.getByRole("button", { name: "Save measurements" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("img", { name: /Weight in lb over the last 90 days/ })).toBeVisible();
});

test("settings: units, data export, and importing events from the original app", async ({ page }) => {
  const email = await signUp(page);
  await page.goto("/tasks");
  await page.getByLabel("New task").fill("Exported task");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("button", { name: "Exported task", exact: true })).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Metric (kg, ml, km)").check();
  await expect(page.getByLabel("Daily water goal (ml)")).toHaveValue("2000");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.goto("/fitness");
  await expect(page.getByRole("button", { name: "+250 ml" })).toBeVisible();

  const response = await page.request.get("/api/export");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).not.toContain("passwordHash");
  expect(body).not.toContain("scrypt$");
  const data = JSON.parse(body);
  expect(data.profile.email).toBe(email);
  expect(data.tasks.map((t: { title: string }) => t.title)).toContain("Exported task");

  // Simulate what the old calendar stored: local-midnight timestamps.
  const legacy = await page.evaluate(() =>
    JSON.stringify([{ title: "Old meeting", date: new Date(2025, 2, 8).getTime(), startTime: 540, endTime: 600, color: "#2563EB" }]),
  );
  await page.goto("/settings");
  await page.getByLabel("Saved events").fill(legacy);
  await page.getByRole("button", { name: "Check data" }).click();
  await expect(page.getByText(/Found 1 event/)).toBeVisible();
  await page.getByRole("button", { name: "Import 1 event" }).click();
  await expect(page.getByText("Imported 1 event.")).toBeVisible();

  await page.getByLabel("Saved events").fill(legacy);
  await page.getByRole("button", { name: "Check data" }).click();
  await page.getByRole("button", { name: "Import 1 event" }).click();
  await expect(page.getByText(/Imported 0 events; 1 already on your calendar were skipped/)).toBeVisible();

  await page.goto("/calendar?view=day&date=2025-03-08");
  await expect(page.getByRole("button", { name: /^Old meeting, 9:00 AM – 10:00 AM/ })).toBeVisible();
});

test("privacy: accounts can't see each other's entries, and the API needs a session", async ({ page, browser, request }) => {
  await signUp(page, "Alice");
  await page.goto("/journal/new");
  await page.getByLabel("Entry", { exact: true }).fill("Alice's private thoughts");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]{36}$/);
  const aliceEntry = page.url();

  const other = await browser.newContext({ timezoneId: "Asia/Tokyo" });
  const mallory = await other.newPage();
  await signUp(mallory, "Mallory");
  await mallory.goto(aliceEntry);
  await expect(mallory.getByRole("heading", { name: "Page not found" })).toBeVisible();
  const exported = await mallory.request.get("/api/export");
  expect(await exported.text()).not.toContain("Alice's private thoughts");
  await other.close();

  const anonymous = await request.get("/api/export");
  expect(anonymous.status()).toBe(401);
});

test("forgot password gives the same answer for known and unknown emails", async ({ page }) => {
  const email = await signUp(page);
  await page.getByRole("button", { name: "Log out" }).click();
  for (const address of [email, uniqueEmail("nobody")]) {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(address);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "If an account exists for" })).toBeVisible();
  }
});

test("deleting the account removes it", async ({ page }) => {
  const email = await signUp(page);
  await page.goto("/settings");
  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account and data" }).click();
  await expect(page).toHaveURL(/\/\?account=deleted$/);
  await expect(page.getByText("Your account and all of its data have been deleted.")).toBeVisible();

  await logIn(page, email);
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
});

test("contact form saves a message", async ({ page }) => {
  await page.goto("/#contact");
  await page.getByLabel("Name", { exact: true }).fill("Visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.com");
  await page.getByLabel("Subject").fill("Feature idea");
  await page.getByLabel("Message").fill("A dark mode toggle would be nice.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Thanks! Your message has been sent.")).toBeVisible();
});

test("landing: product clips play, and the tour switches and pauses them", async ({ page }) => {
  const playing = (video: import("@playwright/test").Locator) =>
    video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0 && v.readyState >= 2);

  await page.goto("/");
  // Before scrolling, the topographic map covers the preview, which holds still and can't be used...
  const heroSection = page.locator("section").first();
  const hero = heroSection.locator("video");
  const preview = heroSection.locator(".hero-demo");
  await expect(heroSection.locator("[data-hero]")).toHaveAttribute("data-hero", "topo");
  await expect(heroSection.locator("svg.topo path").first()).toBeAttached();
  await expect(preview).toHaveAttribute("data-settled", "false");
  await expect(preview).toHaveAttribute("inert", ""); // no clicks or keyboard focus inside
  // ...and once scrolling has started, the map's lines morph into the dashboard, it fades in, and it plays on its own.
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.6, behavior: "instant" }));
  await expect(heroSection.locator("[data-hero]")).toHaveAttribute("data-hero", "framed");
  await expect(preview).toHaveAttribute("data-settled", "true");
  await expect(preview).not.toHaveAttribute("inert");
  expect(await preview.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await expect.poll(() => playing(hero), { timeout: 15_000 }).toBe(true);

  const tour = page.locator("#features");
  await tour.locator("video").scrollIntoViewIfNeeded();
  await expect(tour.getByRole("tab", { name: "Tasks" })).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => playing(tour.locator("video")), { timeout: 15_000 }).toBe(true);
  await expect(tour.locator("video")).toHaveAttribute("src", /\/demos\/tasks-(light|dark)\.mp4$/);

  // Picking a tab swaps the clip and keeps it there.
  await tour.getByRole("tab", { name: "Mood" }).click();
  await expect(tour.getByRole("tab", { name: "Mood" })).toHaveAttribute("aria-selected", "true");
  await expect(tour.getByRole("img", { name: /mood check-in/i })).toBeVisible();
  await tour.locator("video").scrollIntoViewIfNeeded();
  await expect(tour.locator("video")).toHaveAttribute("src", /\/demos\/mood-(light|dark)\.mp4$/);
  await expect.poll(() => playing(tour.locator("video")), { timeout: 15_000 }).toBe(true);

  // Every clip can be paused.
  await tour.getByRole("button", { name: "Pause Mood demo" }).click();
  await expect(tour.getByRole("button", { name: "Play Mood demo" })).toBeVisible();
  expect(await tour.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("landing: the day timeline plays when in view, and Play, Pause and Replay control it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const day = page.locator(".day-section");
  const time = () => day.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--t")));
  await expect(day).toHaveAttribute("data-fx", "auto sun moments sheen");
  await expect(day).toHaveAttribute("data-live", "");
  await expect(day).not.toHaveAttribute("data-play");

  // It starts on its own once the section is on screen.
  await day.locator("ol").scrollIntoViewIfNeeded();
  await expect(day).toHaveAttribute("data-play", "playing");
  await expect(day.locator(".day-sun")).toBeVisible();
  await expect.poll(time).toBeGreaterThan(0);

  // Pause holds the sun where it is.
  await day.getByRole("button", { name: "Pause the day's animation" }).click();
  await expect(day).toHaveAttribute("data-play", "paused");
  const held = await time();
  await page.waitForTimeout(800);
  expect(await time()).toBe(held);

  // Play resumes it, and it rests at night when the day is over.
  await day.getByRole("button", { name: "Play the day's animation" }).click();
  await expect(day).toHaveAttribute("data-play", "playing");
  await expect(day).toHaveAttribute("data-play", "done", { timeout: 15_000 });
  expect(await time()).toBe(1);

  // Replay starts again from dawn.
  await day.getByRole("button", { name: "Replay the day's animation" }).click();
  await expect(day).toHaveAttribute("data-play", "playing");
  await expect.poll(time).toBeLessThan(0.5);
});

test("landing: the day timeline's ?dayfx= switches, including hang", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const day = page.locator(".day-section");
  const cards = day.locator(".day-hang");

  // No effects: nothing animates, there's no button, and every card is simply there.
  await page.goto("/?dayfx=none");
  await expect(day).toHaveAttribute("data-fx", "");
  await expect(day).not.toHaveAttribute("data-live");
  await expect(day.getByRole("button", { name: /the day's animation/ })).toHaveCount(0);
  await expect(day.locator(".day-sun")).toBeHidden();

  // Unknown names are dropped; hang on its own follows the scroll (no button).
  await page.goto("/?dayfx=hang,bogus");
  await expect(day).toHaveAttribute("data-fx", "hang");
  await expect(day).toHaveAttribute("data-live", "");
  await expect(day.getByRole("button", { name: /the day's animation/ })).toHaveCount(0);

  // With auto, the cards are hidden until the day starts, then each swings down on its thread and settles.
  await page.goto("/?dayfx=auto,hang");
  await expect(day).toHaveAttribute("data-fx", "auto hang");
  expect(await cards.first().evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await expect(day.locator(".day-thread").first()).toBeAttached();
  await day.locator("ol").scrollIntoViewIfNeeded();
  await expect(day).toHaveAttribute("data-play", "playing");
  await expect
    .poll(() => cards.evaluateAll((els) => els.map((el) => `${getComputedStyle(el).opacity} ${getComputedStyle(el).rotate}`)), { timeout: 5_000 })
    .toEqual(Array(6).fill("1 0deg"));
  expect(await day.locator(".day-thread").first().evaluate((el) => getComputedStyle(el).display)).toBe("block");
});

test("landing: with reduced motion, the day timeline holds still with every card shown", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?dayfx=auto,sun,moments,sheen,hang");
  const day = page.locator(".day-section");
  await day.locator("ol").scrollIntoViewIfNeeded();
  await expect(day).not.toHaveAttribute("data-live");
  await expect(day).not.toHaveAttribute("data-play");
  await expect(day.getByRole("button", { name: /the day's animation/ })).toHaveCount(0);
  expect(await day.locator(".day-hang").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity))).toEqual(Array(6).fill("1"));
});

test("landing: the FAQ opens and closes", async ({ page }) => {
  await page.goto("/#faq");
  const faq = page.locator("#faq");
  const question = faq.getByText("How much does it cost?");
  const answer = faq.getByText(/free to use, with no paid plans/);
  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
  await question.click();
  await expect(answer).toBeHidden();
});

test("landing: with reduced motion, the layout is still and clips wait for a click", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator("section").first();
  await expect(hero.getByRole("img", { name: /dashboard in use/i })).toBeVisible();
  // No reveal: the preview is there and usable straight away.
  await expect(hero.locator("[data-settled]")).toHaveAttribute("data-settled", "true");
  expect(await hero.locator(".hero-demo").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  // The sky behind the page is simply the full sun, from the top, and doesn't move.
  const sun = page.locator(".sky-window .sky-art").first();
  expect(await sun.evaluate((el) => Number(getComputedStyle(el.querySelector(".sky-rays")!).opacity))).toBe(1);
  const before = await sun.boundingBox();
  await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
  expect(await sun.boundingBox()).toEqual(before);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(1000);
  expect(await hero.locator("video").getAttribute("src")).toBeNull();
  await hero.getByRole("button", { name: "Play product demo" }).click();
  await expect(hero.getByRole("button", { name: "Pause product demo" })).toBeVisible({ timeout: 15_000 });
});

test("landing: a moon behind the page rises into a full sun by the end", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // One window onto the sky per full-width surface, each showing it in the same place.
  const look = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".sky-window .sky-art")].map((art) => {
        const r = art.getBoundingClientRect();
        return {
          x: Math.round(r.left),
          y: Math.round(r.top),
          size: Math.round(r.width),
          rays: Number(getComputedStyle(art.querySelector(".sky-rays")!).opacity),
          color: getComputedStyle(art.querySelector(".sky-tint")!).color,
        };
      }),
    );
  const start = await look();
  expect(start.length).toBeGreaterThanOrEqual(5);
  const placed = ({ x, y, size, rays }: (typeof start)[number]) => ({ x, y, size, rays });
  start.forEach((sky) => expect(placed(sky)).toEqual(placed(start[0])));
  expect(start[0].rays).toBe(0); // a moon: no rays yet
  expect(start[0].size).toBeGreaterThan(600); // a background, not an icon

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect.poll(async () => (await look())[0].rays).toBeGreaterThan(0.99);
  const end = await look();
  end.forEach((sky) => expect(placed(sky)).toEqual(placed(end[0])));
  expect(end[0].y).toBeLessThan(start[0].y - 200); // it rose
  expect(end[0].color).not.toBe(start[0].color); // moon blue to gold

  // It's behind the page: under each surface's content, and never in the way of a click.
  const sky = page.locator(".sky-window").first();
  expect(await sky.evaluate((el) => [getComputedStyle(el).zIndex, getComputedStyle(el).pointerEvents])).toEqual(["-2", "none"]);
  await page.getByRole("link", { name: "Create your planner" }).last().click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("landing: focusing the closing button doesn't shift the horizon artwork", async ({ page }) => {
  await page.goto("/");
  const closing = page.locator("section").last();
  await closing.getByRole("link", { name: "Create your planner" }).focus();
  await page.waitForTimeout(500);
  // The ground stays on the band's bottom edge (the band can't be scrolled internally).
  const gap = await closing.evaluate((section) => section.getBoundingClientRect().bottom - section.children[1].getBoundingClientRect().bottom);
  expect(Math.abs(gap)).toBeLessThan(1);
});

test("landing: the contact form opens from its disclosure and from a #contact link", async ({ page }) => {
  await page.goto("/");
  const contact = page.locator("#contact");
  await expect(contact.getByLabel("Message")).toBeHidden();
  await contact.getByText("Send us a message").click();
  await expect(contact.getByLabel("Message")).toBeVisible();
  await page.goto("/#contact");
  await expect(page.locator("#contact").getByLabel("Message")).toBeVisible();
});

test("theme: dark mode applies before paint and survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
