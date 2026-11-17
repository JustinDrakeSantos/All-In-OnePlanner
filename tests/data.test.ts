import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSessionRecord, validateSessionToken } from "@/server/data/sessions";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createUser,
  deleteUserAndData,
  findUserByEmail,
} from "@/server/data/users";
import {
  createTask,
  deleteTask,
  getTask,
  listTaskLists,
  listTasks,
  setTaskDone,
  taskStats,
  updateTask,
  type TaskInput,
} from "@/server/data/tasks";
import { createEvent, deleteEvent, importEvents, listEventsBetween, updateEvent } from "@/server/data/events";
import { createEntry, getEntry, listEntries, listTags } from "@/server/data/journal";
import { moodOn, moodsBetween, upsertMood } from "@/server/data/mood";
import { metricsBetween, upsertMetrics } from "@/server/data/fitness";
import { createHabit, toggleCheckin } from "@/server/data/habits";
import { exportUserData } from "@/server/data/export";
import { upcomingReminders } from "@/server/data/reminders";
import { toCurrentUser } from "@/server/auth/current-user";
import type { ImportedEvent } from "@/lib/legacy-import";

let counter = 0;
async function newUser(timezone = "America/Los_Angeles") {
  counter += 1;
  const user = await createUser({
    email: `user${counter}-${crypto.randomUUID()}@example.com`,
    name: `User ${counter}`,
    passwordHash: "scrypt$1$1$1$x$y",
    timezone,
  });
  if (!user) throw new Error("user not created");
  return user;
}

const task = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  title: "Task",
  notes: null,
  dueDate: null,
  priority: "medium",
  listId: null,
  recurrence: "none",
  status: "todo",
  ...overrides,
});

const event = {
  title: "Dentist",
  date: "2025-03-08",
  allDay: false,
  startMinute: 540,
  endMinute: 600,
  color: "glacier",
  location: null,
  notes: null,
  reminderMinutes: null,
};

describe("passwords and sessions", () => {
  it("hashes with scrypt and verifies only the right password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("validates session tokens and rejects unknown ones", async () => {
    const user = await newUser();
    const { token } = await createSessionRecord(user.id);
    expect((await validateSessionToken(token))?.id).toBe(user.id);
    expect(await validateSessionToken("forged-token")).toBeNull();
  });

  it("refuses a duplicate email", async () => {
    const user = await newUser();
    const again = await createUser({ email: user.email, name: "Dup", passwordHash: "x", timezone: "UTC" });
    expect(again).toBeNull();
  });

  it("creates starter task lists for new accounts", async () => {
    const user = await newUser();
    expect((await listTaskLists(user.id)).map((l) => l.name)).toEqual(["Personal", "Work", "School"]);
  });

  it("uses password-reset tokens once", async () => {
    const user = await newUser();
    const token = await createPasswordResetToken(user.id);
    expect(await consumePasswordResetToken(token)).toBe(user.id);
    expect(await consumePasswordResetToken(token)).toBeNull();
    expect(await consumePasswordResetToken("made-up-token-made-up-token")).toBeNull();
  });
});

describe("data isolation between accounts", () => {
  it("never lets one user read, change, or delete another user's records", async () => {
    const alice = await newUser();
    const mallory = await newUser();

    const aliceTask = await createTask(alice.id, task({ title: "Alice's task" }), "2025-03-08");
    const aliceEvent = await createEvent(alice.id, event);
    const aliceEntry = await createEntry(alice.id, {
      date: "2025-03-08",
      kind: "entry",
      title: "Private",
      body: "Secret thoughts",
      prompt: null,
      tags: ["private"],
    });

    // Reads
    expect(await getTask(mallory.id, aliceTask.id)).toBeNull();
    expect(await listTasks(mallory.id, "all", "2025-03-08")).toEqual([]);
    expect(await listEventsBetween(mallory.id, "2025-01-01", "2025-12-31")).toEqual([]);
    expect(await getEntry(mallory.id, aliceEntry.id)).toBeNull();
    expect(await listEntries(mallory.id, { q: "Secret" })).toEqual([]);
    expect(await listTags(mallory.id)).toEqual([]);

    // Writes
    expect(await updateTask(mallory.id, aliceTask.id, task({ title: "hacked" }), "2025-03-08")).toBeNull();
    expect(await setTaskDone(mallory.id, aliceTask.id, true, "2025-03-08")).toBeNull();
    expect(await updateEvent(mallory.id, aliceEvent.id, { ...event, title: "hacked" })).toBeNull();
    expect(await deleteTask(mallory.id, aliceTask.id)).toBe(false);
    expect(await deleteEvent(mallory.id, aliceEvent.id)).toBe(false);

    // Alice's data is untouched.
    expect((await getTask(alice.id, aliceTask.id))?.title).toBe("Alice's task");
    expect((await listEventsBetween(alice.id, "2025-03-08", "2025-03-08"))[0].title).toBe("Dentist");

    // Habits: can't check in someone else's habit.
    const habit = await createHabit(alice.id, { name: "Stretch", color: "slate", targetPerWeek: 5 });
    expect(await toggleCheckin(mallory.id, habit.id, "2025-03-08")).toBeNull();
    expect(await toggleCheckin(alice.id, habit.id, "2025-03-08")).toBe(true);
    expect(await toggleCheckin(alice.id, habit.id, "2025-03-08")).toBe(false);
  });

  it("deletes every record when an account is deleted", async () => {
    const user = await newUser();
    await createTask(user.id, task(), "2025-03-08");
    await createEvent(user.id, event);
    await upsertMood(user.id, { date: "2025-03-08", mood: 4, energy: 3, emotions: ["calm"], note: null });
    await deleteUserAndData(user.id);

    expect(await findUserByEmail(user.email)).toBeNull();
    const data = await exportUserData(user.id);
    expect(data.profile).toBeUndefined();
    expect(data.tasks).toEqual([]);
    expect(data.events).toEqual([]);
    expect(data.moodEntries).toEqual([]);
    expect(data.taskLists).toEqual([]);
  });
});

describe("tasks", () => {
  it("schedules the next occurrence when a recurring task is completed", async () => {
    const user = await newUser();
    const weekly = await createTask(user.id, task({ title: "Water plants", dueDate: "2025-03-08", recurrence: "weekly" }), "2025-03-08");
    await setTaskDone(user.id, weekly.id, true, "2025-03-08");

    const open = await listTasks(user.id, "all", "2025-03-08");
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ title: "Water plants", dueDate: "2025-03-15", status: "todo" });

    const stats = await taskStats(user.id, "2025-03-08");
    expect(stats.completedThisWeek).toBe(1);
    expect(stats.currentStreak).toBe(1);
  });

  it("sorts today's view: overdue and due today, high priority first", async () => {
    const user = await newUser();
    await createTask(user.id, task({ title: "later", dueDate: "2025-03-20" }), "2025-03-08");
    await createTask(user.id, task({ title: "low today", dueDate: "2025-03-08", priority: "low" }), "2025-03-08");
    await createTask(user.id, task({ title: "high today", dueDate: "2025-03-08", priority: "high" }), "2025-03-08");
    await createTask(user.id, task({ title: "overdue", dueDate: "2025-03-01" }), "2025-03-08");

    const today = await listTasks(user.id, "today", "2025-03-08");
    expect(today.map((t) => t.title)).toEqual(["overdue", "high today", "low today"]);
  });
});

describe("events", () => {
  it("imports legacy events once, skipping duplicates", async () => {
    const user = await newUser();
    const legacy: ImportedEvent[] = [
      { title: "Class", date: "2025-03-03", allDay: false, startMinute: 600, endMinute: 690, color: "glacier" },
      { title: "Trip", date: "2025-03-04", allDay: true, startMinute: 0, endMinute: 1440, color: "slate" },
    ];
    expect(await importEvents(user.id, legacy)).toEqual({ added: 2, duplicates: 0 });
    expect(await importEvents(user.id, legacy)).toEqual({ added: 0, duplicates: 2 });
    expect(await listEventsBetween(user.id, "2025-03-01", "2025-03-31")).toHaveLength(2);
  });

  it("builds reminders in the user's time zone", async () => {
    const user = await newUser("Asia/Tokyo");
    await createEvent(user.id, { ...event, date: "2025-03-08", startMinute: 9 * 60, endMinute: 10 * 60, reminderMinutes: 15 });
    // 23:00 UTC on Mar 7 is 08:00 on Mar 8 in Tokyo; the reminder fires at 08:45 Tokyo = 23:45 UTC.
    const reminders = await upcomingReminders(toCurrentUser(user), new Date("2025-03-07T23:00:00Z"));
    expect(reminders).toHaveLength(1);
    expect(reminders[0].at).toBe("2025-03-07T23:45:00.000Z");
  });
});

describe("journal, mood, and metrics", () => {
  it("filters journal entries by tag, kind, and search text (wildcards are literal)", async () => {
    const user = await newUser();
    const base = { date: "2025-03-08", prompt: null };
    await createEntry(user.id, { ...base, kind: "gratitude", title: "Thanks", body: "Grateful for 100% effort", tags: ["family"] });
    await createEntry(user.id, { ...base, kind: "entry", title: "Work day", body: "Busy", tags: ["work", "family"] });

    expect((await listEntries(user.id, { tag: "work" })).map((e) => e.title)).toEqual(["Work day"]);
    expect((await listEntries(user.id, { kind: "gratitude" })).map((e) => e.title)).toEqual(["Thanks"]);
    expect((await listEntries(user.id, { q: "100%" })).map((e) => e.title)).toEqual(["Thanks"]);
    expect(await listEntries(user.id, { q: "%" })).toHaveLength(1);
    expect(await listTags(user.id)).toEqual([
      { tag: "family", count: 2 },
      { tag: "work", count: 1 },
    ]);
  });

  it("keeps one mood check-in per day", async () => {
    const user = await newUser();
    await upsertMood(user.id, { date: "2025-03-08", mood: 2, energy: null, emotions: ["tired"], note: "meh" });
    await upsertMood(user.id, { date: "2025-03-08", mood: 4, energy: 4, emotions: ["calm", "happy"], note: null });
    expect(await moodOn(user.id, "2025-03-08")).toMatchObject({ mood: 4, energy: 4, emotions: ["calm", "happy"] });
    expect(await moodsBetween(user.id, "2025-03-01", "2025-03-31")).toHaveLength(1);
  });

  it("fills in health metrics without erasing earlier values", async () => {
    const user = await newUser();
    await upsertMetrics(user.id, { date: "2025-03-08", weightKg: 70, steps: null, sleepHours: null });
    await upsertMetrics(user.id, { date: "2025-03-08", weightKg: null, steps: 9000, sleepHours: 7.5 });
    const [row] = await metricsBetween(user.id, "2025-03-08", "2025-03-08");
    expect(row).toMatchObject({ weightKg: 70, steps: 9000, sleepHours: 7.5 });
  });
});
