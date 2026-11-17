import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/*
 * Conventions
 * - Calendar dates are stored as "YYYY-MM-DD" text. They name a day on the
 *   user's calendar, not an instant, so they never shift with time zones.
 * - Times of day are minutes after midnight (0–1440), as in the original app.
 * - Instants (createdAt, expiresAt, …) are Unix epoch milliseconds.
 * - Every user-owned row carries userId; all reads and writes filter on it.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// The SQL default only has second precision; inserts from the app set
// millisecond timestamps in JavaScript.
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

const userRef = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  unitSystem: text("unit_system", { enum: ["imperial", "metric"] })
    .notNull()
    .default("imperial"),
  waterGoalMl: integer("water_goal_ml").notNull().default(2000),
  stepGoal: integer("step_goal").notNull().default(8000),
  /** "HH:MM" local time for the daily mood check-in reminder, or null. */
  moodReminderTime: text("mood_reminder_time"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: userRef(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    /** SHA-256 of the emailed token. */
    id: text("id").primaryKey(),
    userId: userRef(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

export const contactMessages = sqliteTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const taskLists = sqliteTable(
  "task_lists",
  {
    id: id(),
    userId: userRef(),
    name: text("name").notNull(),
    /** One of the tones in src/lib/constants.ts (glacier, navy, lemon, slate). */
    color: text("color").notNull().default("glacier"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("task_lists_user_name_idx").on(t.userId, t.name)],
);

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const TASK_RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    userId: userRef(),
    listId: text("list_id").references(() => taskLists.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    notes: text("notes"),
    dueDate: text("due_date"),
    priority: text("priority", { enum: TASK_PRIORITIES }).notNull().default("medium"),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("todo"),
    recurrence: text("recurrence", { enum: TASK_RECURRENCES }).notNull().default("none"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    /** Calendar day (user's time zone) the task was completed; drives streaks. */
    completedOn: text("completed_on"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_user_due_idx").on(t.userId, t.dueDate),
    index("tasks_user_status_idx").on(t.userId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export const events = sqliteTable(
  "events",
  {
    id: id(),
    userId: userRef(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    startMinute: integer("start_minute").notNull().default(0),
    endMinute: integer("end_minute").notNull().default(1440),
    color: text("color").notNull().default("glacier"),
    location: text("location"),
    notes: text("notes"),
    /** Minutes before the start to remind; null means no reminder. */
    reminderMinutes: integer("reminder_minutes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("events_user_date_idx").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export const JOURNAL_KINDS = ["entry", "gratitude", "reflection"] as const;

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: id(),
    userId: userRef(),
    date: text("date").notNull(),
    kind: text("kind", { enum: JOURNAL_KINDS }).notNull().default("entry"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    prompt: text("prompt"),
    /** Normalized tags stored as ",tag-one,tag-two," so a tag filter is a LIKE '%,tag,%'. */
    tags: text("tags").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("journal_user_date_idx").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

export const moodEntries = sqliteTable(
  "mood_entries",
  {
    id: id(),
    userId: userRef(),
    date: text("date").notNull(),
    /** 1 (awful) … 5 (great) */
    mood: integer("mood").notNull(),
    /** 1 (drained) … 5 (energized) */
    energy: integer("energy"),
    /** Comma-separated emotion labels. */
    emotions: text("emotions").notNull().default(""),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("mood_user_date_idx").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// Fitness & health
// ---------------------------------------------------------------------------

export const WORKOUT_TYPES = [
  "run",
  "walk",
  "cycle",
  "swim",
  "strength",
  "yoga",
  "hiit",
  "sport",
  "other",
] as const;
export const WORKOUT_INTENSITIES = ["low", "moderate", "high"] as const;

export const workouts = sqliteTable(
  "workouts",
  {
    id: id(),
    userId: userRef(),
    date: text("date").notNull(),
    type: text("type", { enum: WORKOUT_TYPES }).notNull(),
    title: text("title").notNull(),
    durationMin: integer("duration_min").notNull(),
    intensity: text("intensity", { enum: WORKOUT_INTENSITIES }).notNull().default("moderate"),
    distanceKm: real("distance_km"),
    calories: integer("calories"),
    notes: text("notes"),
    /** false = planned, true = done */
    completed: integer("completed", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("workouts_user_date_idx").on(t.userId, t.date)],
);

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const meals = sqliteTable(
  "meals",
  {
    id: id(),
    userId: userRef(),
    date: text("date").notNull(),
    mealType: text("meal_type", { enum: MEAL_TYPES }).notNull(),
    description: text("description").notNull(),
    calories: integer("calories"),
    createdAt: createdAt(),
  },
  (t) => [index("meals_user_date_idx").on(t.userId, t.date)],
);

export const waterLogs = sqliteTable(
  "water_logs",
  {
    id: id(),
    userId: userRef(),
    date: text("date").notNull(),
    amountMl: integer("amount_ml").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("water_user_date_idx").on(t.userId, t.date)],
);

export const healthMetrics = sqliteTable(
  "health_metrics",
  {
    id: id(),
    userId: userRef(),
    date: text("date").notNull(),
    weightKg: real("weight_kg"),
    steps: integer("steps"),
    sleepHours: real("sleep_hours"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("metrics_user_date_idx").on(t.userId, t.date)],
);

export const habits = sqliteTable(
  "habits",
  {
    id: id(),
    userId: userRef(),
    name: text("name").notNull(),
    color: text("color").notNull().default("glacier"),
    /** How many days per week the user aims for (1–7). */
    targetPerWeek: integer("target_per_week").notNull().default(7),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("habits_user_idx").on(t.userId)],
);

export const habitCheckins = sqliteTable(
  "habit_checkins",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: userRef(),
    date: text("date").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.habitId, t.date] }),
    index("habit_checkins_user_date_idx").on(t.userId, t.date),
  ],
);

export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskList = typeof taskLists.$inferSelect;
export type CalendarEvent = typeof events.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type Habit = typeof habits.$inferSelect;
