/**
 * Creates (or recreates) a demo account full of sample data, relative to today.
 *
 *   npm run db:seed
 *   → log in as demo@example.com / demo-password
 *
 * Only touches the demo account. Intended for local development.
 */
import { addDays, todayInTimeZone } from "../src/lib/dates";
import { hashPassword } from "../src/server/auth/password";
import { createEvent } from "../src/server/data/events";
import { addMeal, addWater, createWorkout, upsertMetrics } from "../src/server/data/fitness";
import { createHabit, toggleCheckin } from "../src/server/data/habits";
import { createEntry } from "../src/server/data/journal";
import { upsertMood } from "../src/server/data/mood";
import { createTask, listTaskLists, setTaskDone } from "../src/server/data/tasks";
import { createUser, deleteUserAndData, findUserByEmail } from "../src/server/data/users";

const EMAIL = "demo@example.com";
const PASSWORD = "demo-password";
const TIMEZONE = process.env.SEED_TIMEZONE ?? "America/Los_Angeles";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SEED) {
    throw new Error("Refusing to seed in production. Set ALLOW_SEED=1 if you really mean it.");
  }
  const existing = await findUserByEmail(EMAIL);
  if (existing) await deleteUserAndData(existing.id);

  const user = await createUser({ email: EMAIL, name: "Alex Rivera", passwordHash: await hashPassword(PASSWORD), timezone: TIMEZONE });
  if (!user) throw new Error("Could not create the demo user");
  const id = user.id;
  const today = todayInTimeZone(TIMEZONE);
  const day = (offset: number) => addDays(today, offset);

  // Tasks ---------------------------------------------------------------------
  const lists = Object.fromEntries((await listTaskLists(id)).map((l) => [l.name, l.id]));
  const task = (title: string, offset: number | null, extra: Partial<Parameters<typeof createTask>[1]> = {}) =>
    createTask(
      id,
      {
        title,
        notes: null,
        dueDate: offset === null ? null : day(offset),
        priority: "medium",
        listId: null,
        recurrence: "none",
        status: "todo",
        ...extra,
      },
      today,
    );
  await task("Finish CS homework #3", -1, { priority: "high", listId: lists.School });
  await task("Email internship coordinator", 0, { priority: "high", listId: lists.Work, notes: "Ask about the summer start date." });
  await task("Read chapter 5 for seminar", 0, { listId: lists.School });
  await task("Water the plants", 0, { recurrence: "weekly", priority: "low", listId: lists.Personal });
  await task("Draft project proposal", 2, { priority: "high", listId: lists.Work });
  await task("Book dentist appointment", 4, { listId: lists.Personal });
  await task("Plan weekend groceries", 5, { priority: "low", listId: lists.Personal });
  await task("Update résumé", null, { listId: lists.Work });
  for (const [title, offset] of [["Submit lab report", -3], ["Call Grandma", -2], ["Pay phone bill", -1], ["Laundry", -4], ["Review lecture notes", -5]] as const) {
    const t = await task(title, offset);
    await setTaskDone(id, t.id, true, day(offset));
  }

  // Events --------------------------------------------------------------------
  const event = (title: string, offset: number, start: number, end: number, color: string, extra: { location?: string; allDay?: boolean } = {}) =>
    createEvent(id, {
      title,
      date: day(offset),
      allDay: extra.allDay ?? false,
      startMinute: extra.allDay ? 0 : start,
      endMinute: extra.allDay ? 1440 : end,
      color,
      location: extra.location ?? null,
      notes: null,
      reminderMinutes: extra.allDay ? null : 15,
    });
  await event("Study group", 0, 9 * 60, 10 * 60 + 30, "glacier", { location: "Library, room 204" });
  await event("Lunch with Sam", 0, 12 * 60 + 30, 13 * 60 + 30, "slate");
  await event("Team sync", 0, 13 * 60, 14 * 60, "navy");
  await event("Evening run", 0, 18 * 60, 18 * 60 + 45, "lemon");
  await event("Career fair", 1, 0, 0, "lemon", { allDay: true });
  await event("Seminar", 1, 10 * 60, 11 * 60 + 30, "glacier", { location: "Hall B" });
  await event("Dentist", 3, 15 * 60, 16 * 60, "slate");
  await event("Movie night", 5, 19 * 60, 21 * 60 + 30, "navy");
  await event("Project deadline", 9, 0, 0, "lemon", { allDay: true });
  await event("Yoga class", -2, 8 * 60, 9 * 60, "slate");

  // Journal -------------------------------------------------------------------
  await createEntry(id, {
    date: day(0),
    kind: "gratitude",
    title: "Small wins",
    body: "1. A quiet morning with coffee.\n2. Sam checking in.\n3. Finally understanding recursion.",
    prompt: "List three things you're grateful for today.",
    tags: ["gratitude", "school"],
  });
  await createEntry(id, {
    date: day(-1),
    kind: "reflection",
    title: "Busy but good week",
    body: "The deadlines piled up, but planning each morning helped. I want to protect my evening runs.",
    prompt: "What went well this week, and what would you change?",
    tags: ["weekly-review"],
  });
  await createEntry(id, { date: day(-3), kind: "entry", title: "Career fair prep", body: "Made a list of companies to visit and practiced my intro.", prompt: null, tags: ["career", "school"] });
  await createEntry(id, { date: day(-8), kind: "entry", title: "New running route", body: "Tried the river trail. Five kilometres felt easy today.", prompt: null, tags: ["fitness"] });

  // Mood (last 30 days, with a few gaps) ----------------------------------------
  const pattern = [4, 3, 4, 5, 3, 2, 3, 4, 4, 5, 4, 3, 3, 4, 2, 3, 4, 5, 5, 4, 3, 4, 4, 3, 5, 4, 3, 4, 4, 4];
  const emotionSets = [["calm", "focused"], ["tired"], ["happy", "grateful"], ["excited", "proud"], ["stressed"], ["anxious", "tired"], ["hopeful"]];
  for (let i = 29; i >= 0; i -= 1) {
    if (i % 9 === 4) continue;
    const mood = pattern[29 - i];
    await upsertMood(id, {
      date: day(-i),
      mood,
      energy: Math.max(1, Math.min(5, mood + ((i % 3) - 1))),
      emotions: emotionSets[i % emotionSets.length],
      note: i === 0 ? "Productive morning, looking forward to the run." : null,
    });
  }

  // Fitness -------------------------------------------------------------------
  const workouts: [number, "run" | "strength" | "yoga" | "walk" | "cycle", string, number, boolean][] = [
    [-13, "run", "Easy run", 30, true],
    [-11, "strength", "Upper body", 45, true],
    [-9, "yoga", "Morning yoga", 25, true],
    [-7, "run", "Tempo run", 35, true],
    [-6, "walk", "Campus walk", 40, true],
    [-4, "strength", "Leg day", 50, true],
    [-2, "yoga", "Yoga class", 60, true],
    [-1, "cycle", "Bike to campus", 30, true],
    [0, "run", "Evening run", 45, false],
    [2, "strength", "Full body", 45, false],
  ];
  for (const [offset, type, title, minutes, done] of workouts) {
    await createWorkout(id, {
      date: day(offset),
      type,
      title,
      durationMin: minutes,
      intensity: "moderate",
      distanceKm: type === "run" ? minutes / 6 : null,
      calories: null,
      notes: null,
      completed: done && offset < 0,
    });
  }
  for (let i = 89; i >= 0; i -= 1) {
    if (i % 2 === 1 && i > 14) continue;
    await upsertMetrics(id, {
      date: day(-i),
      weightKg: i % 3 === 0 ? 72.5 - (89 - i) * 0.02 + Math.sin(i / 4) * 0.3 : null,
      steps: i <= 13 ? 6000 + ((i * 1371) % 5200) : null,
      sleepHours: i <= 13 ? 6.5 + ((i * 7) % 4) * 0.5 : null,
    });
  }
  for (const amount of [500, 350, 500]) await addWater(id, today, amount);
  for (let i = 1; i <= 6; i += 1) await addWater(id, day(-i), 1200 + ((i * 317) % 1000));
  await addMeal(id, { date: today, mealType: "breakfast", description: "Oatmeal with berries", calories: 350 });
  await addMeal(id, { date: today, mealType: "lunch", description: "Chicken wrap and salad", calories: 620 });

  const habits = [
    await createHabit(id, { name: "Stretch for 10 minutes", color: "glacier", targetPerWeek: 7 }),
    await createHabit(id, { name: "Read 20 pages", color: "lemon", targetPerWeek: 5 }),
    await createHabit(id, { name: "No phone after 11 PM", color: "navy", targetPerWeek: 7 }),
  ];
  for (let i = 1; i <= 20; i += 1) {
    if (i % 5 !== 3) await toggleCheckin(id, habits[0].id, day(-i));
    if (i % 2 === 0) await toggleCheckin(id, habits[1].id, day(-i));
    if (i % 4 !== 0) await toggleCheckin(id, habits[2].id, day(-i));
  }
  await toggleCheckin(id, habits[0].id, today);

  console.log(`Demo account ready: ${EMAIL} / ${PASSWORD} (time zone ${TIMEZONE}, today ${today}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
