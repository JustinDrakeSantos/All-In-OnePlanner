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

test("landing: the live demos respond and reset", async ({ page }) => {
  await page.goto("/");
  const tour = page.locator("#tour");

  await tour.getByRole("checkbox", { name: /^Water the plants/ }).check();
  await expect(tour.getByText("Streak extended for today.")).toBeVisible();
  await expect(tour.getByText("5 days")).toBeVisible();
  await tour.getByRole("button", { name: "Reset" }).click();
  await expect(tour.getByText("4 days")).toBeVisible();

  await tour.getByRole("tab", { name: "Calendar" }).click();
  await tour.getByRole("button", { name: "Add an event on Mon at 1:00 PM" }).click();
  await expect(tour.getByRole("button", { name: "New event, Mon at 1:00 PM. Remove" })).toBeVisible();
  await tour.getByRole("button", { name: "New event, Mon at 1:00 PM. Remove" }).click();
  await expect(tour.getByRole("button", { name: /^New event/ })).toHaveCount(0);

  await tour.getByRole("tab", { name: "Mood" }).click();
  await tour.getByRole("button", { name: "Awful" }).click();
  await expect(tour.getByRole("button", { name: "Awful" })).toHaveAttribute("aria-pressed", "true");
  await expect(tour.getByText("A few things that might help")).toBeVisible();

  await tour.getByRole("tab", { name: "Fitness" }).click();
  await tour.getByRole("button", { name: "+16 oz" }).click();
  await tour.getByRole("button", { name: "+16 oz" }).click();
  await tour.getByRole("button", { name: "+16 oz" }).click();
  await expect(tour.getByText("Goal reached")).toBeVisible();
  await tour.getByRole("button", { name: "Stretch, today: not done" }).click();
  await expect(tour.getByText("7-day streak")).toBeVisible();

  // Stops without a demo still show the screenshot.
  await tour.getByRole("tab", { name: "Journal" }).click();
  await expect(tour.getByRole("img", { name: /journal/i }).first()).toBeVisible();
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
