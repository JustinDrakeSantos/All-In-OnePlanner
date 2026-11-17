import { z } from "zod";
import { isISODate, isValidTimeZone, parseTimeInput } from "./dates";
import { EMOTIONS, REMINDER_OPTIONS, TONE_VALUES } from "./constants";

// ---------------------------------------------------------------------------
// Field helpers. FormData gives strings (or null when a field is missing).
// ---------------------------------------------------------------------------

const blankToEmpty = (v: unknown) => (v === null || v === undefined ? "" : v);

const requiredText = (label: string, max: number) =>
  z.preprocess(
    blankToEmpty,
    z
      .string()
      .trim()
      .min(1, { error: `${label} is required.` })
      .max(max, { error: `${label} must be ${max} characters or fewer.` }),
  );

const optionalText = (max: number) =>
  z
    .preprocess(
      blankToEmpty,
      z.string().trim().max(max, { error: `Keep this under ${max} characters.` }),
    )
    .transform((v) => (v === "" ? null : v));

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const isoDate = z.preprocess(
  blankToEmpty,
  z.string().refine(isISODate, { error: "Enter a valid date." }),
);

const optionalIsoDate = z
  .preprocess(
    blankToEmpty,
    z.string().refine((v) => v === "" || isISODate(v), { error: "Enter a valid date." }),
  )
  .transform((v) => (v === "" ? null : v));

const optionalNumber = (label: string, min: number, max: number, integer = false) =>
  z
    .preprocess(
      (v) => (v === null || v === undefined || v === "" ? undefined : Number(v)),
      (integer ? z.number().int({ error: `${label} must be a whole number.` }) : z.number({ error: `${label} must be a number.` }))
        .min(min, { error: `${label} must be at least ${min}.` })
        .max(max, { error: `${label} must be at most ${max}.` })
        .optional(),
    )
    .transform((v) => (v === undefined ? null : v));

const requiredNumber = (label: string, min: number, max: number, integer = false) =>
  z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? undefined : Number(v)),
    (integer ? z.number({ error: `${label} is required.` }).int({ error: `${label} must be a whole number.` }) : z.number({ error: `${label} is required.` }))
      .min(min, { error: `${label} must be at least ${min}.` })
      .max(max, { error: `${label} must be at most ${max}.` }),
  );

const tone = z.preprocess(blankToEmpty, z.enum(TONE_VALUES, { error: "Choose a color." }));

const email = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : ""),
  z.email({ error: "Enter a valid email address." }).max(254),
);

const newPassword = z.preprocess(
  blankToEmpty,
  z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .max(200, { error: "Use 200 characters or fewer." }),
);

const timeZone = z.preprocess(
  (v) => (typeof v === "string" && v ? v : "UTC"),
  z.string().refine(isValidTimeZone, { error: "Choose a valid time zone." }),
);

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const signupSchema = z
  .object({
    name: requiredText("Name", 80),
    email,
    password: newPassword,
    confirmPassword: z.preprocess(blankToEmpty, z.string()),
    timezone: timeZone,
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.preprocess(blankToEmpty, z.string().min(1, { error: "Enter your password." })),
  next: optionalText(500),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.preprocess(blankToEmpty, z.string().min(20, { error: "This reset link is invalid." })),
    password: newPassword,
    confirmPassword: z.preprocess(blankToEmpty, z.string()),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.preprocess(blankToEmpty, z.string().min(1, { error: "Enter your current password." })),
    password: newPassword,
    confirmPassword: z.preprocess(blankToEmpty, z.string()),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: requiredText("Name", 80),
  timezone: timeZone,
  unitSystem: z.enum(["imperial", "metric"], { error: "Choose a unit system." }),
  waterGoal: requiredNumber("Water goal", 1, 10000),
  stepGoal: requiredNumber("Step goal", 100, 100000, true),
  moodReminderTime: z
    .preprocess(
      blankToEmpty,
      z.string().refine((v) => v === "" || parseTimeInput(v) !== null, { error: "Enter a valid time." }),
    )
    .transform((v) => (v === "" ? null : v)),
});

export const deleteAccountSchema = z.object({
  password: z.preprocess(blankToEmpty, z.string().min(1, { error: "Enter your password." })),
  confirm: z.preprocess(
    blankToEmpty,
    z.string().refine((v) => v === "DELETE", { error: 'Type DELETE to confirm.' }),
  ),
});

export const contactSchema = z.object({
  name: requiredText("Name", 80),
  email,
  subject: requiredText("Subject", 150),
  message: requiredText("Message", 5000),
  /** Honeypot: real people never see or fill this field. */
  website: optionalText(200),
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const taskSchema = z.object({
  title: requiredText("Title", 200),
  notes: optionalText(2000),
  dueDate: optionalIsoDate,
  priority: z.enum(["low", "medium", "high"], { error: "Choose a priority." }),
  listId: optionalText(64),
  // Absent from quick-add forms (undefined) or left blank: use the defaults.
  recurrence: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? "none" : v),
    z.enum(["none", "daily", "weekly", "monthly"], { error: "Choose how it repeats." }),
  ),
  status: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? "todo" : v),
    z.enum(["todo", "in_progress", "done"], { error: "Choose a status." }),
  ),
});

export const taskListSchema = z.object({
  name: requiredText("List name", 40),
  color: tone,
});

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export const eventSchema = z
  .object({
    title: requiredText("Title", 200),
    date: isoDate,
    allDay: checkbox,
    startTime: z.preprocess(blankToEmpty, z.string()),
    endTime: z.preprocess(blankToEmpty, z.string()),
    color: tone,
    location: optionalText(200),
    notes: optionalText(2000),
    reminder: z.preprocess(
      blankToEmpty,
      z.string().refine((v) => REMINDER_OPTIONS.some((o) => o.value === v), {
        error: "Choose a reminder.",
      }),
    ),
  })
  .transform((data, ctx) => {
    const reminderMinutes = data.reminder === "" ? null : Number(data.reminder);
    if (data.allDay) {
      return { ...data, startMinute: 0, endMinute: 1440, reminderMinutes };
    }
    const startMinute = parseTimeInput(data.startTime);
    const endMinute = parseTimeInput(data.endTime);
    if (startMinute === null) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Enter a start time." });
      return z.NEVER;
    }
    if (endMinute === null) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Enter an end time." });
      return z.NEVER;
    }
    if (endMinute <= startMinute) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after the start time." });
      return z.NEVER;
    }
    return { ...data, startMinute, endMinute, reminderMinutes };
  });

/** Events converted in the browser from the original app's localStorage. */
export const legacyEventsSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(200),
      date: z.string().refine(isISODate),
      allDay: z.boolean(),
      startMinute: z.number().int().min(0).max(1439),
      endMinute: z.number().int().min(1).max(1440),
      color: z.enum(TONE_VALUES),
    }).refine((e) => e.endMinute > e.startMinute),
  )
  .max(5000);

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export function normalizeTags(raw: string): string[] {
  const tags = raw
    .split(/[,#]/)
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30),
    )
    .filter(Boolean);
  return [...new Set(tags)].slice(0, 10);
}

export const journalSchema = z.object({
  date: isoDate,
  kind: z.enum(["entry", "gratitude", "reflection"], { error: "Choose an entry type." }),
  title: z
    .preprocess(blankToEmpty, z.string().trim().max(200, { error: "Keep the title under 200 characters." }))
    .transform((v) => v || "Untitled entry"),
  body: requiredText("Entry", 20000),
  prompt: optionalText(500),
  tags: z.preprocess(blankToEmpty, z.string().max(400)).transform(normalizeTags),
});

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

export const moodSchema = z.object({
  date: isoDate,
  mood: requiredNumber("Mood", 1, 5, true),
  energy: optionalNumber("Energy", 1, 5, true),
  emotions: z
    .array(z.string())
    .default([])
    .transform((list) => list.filter((e): e is (typeof EMOTIONS)[number] => (EMOTIONS as readonly string[]).includes(e))),
  note: optionalText(1000),
});

// ---------------------------------------------------------------------------
// Fitness & health (numbers arrive in the user's units and are converted in the action)
// ---------------------------------------------------------------------------

export const workoutSchema = z.object({
  date: isoDate,
  type: z.enum(["run", "walk", "cycle", "swim", "strength", "yoga", "hiit", "sport", "other"], {
    error: "Choose a workout type.",
  }),
  title: optionalText(120),
  durationMin: requiredNumber("Duration", 1, 1440, true),
  intensity: z.enum(["low", "moderate", "high"], { error: "Choose an intensity." }),
  distance: optionalNumber("Distance", 0, 1000),
  calories: optionalNumber("Calories", 0, 20000, true),
  notes: optionalText(1000),
  planned: checkbox,
});

export const mealSchema = z.object({
  date: isoDate,
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"], { error: "Choose a meal." }),
  description: requiredText("Description", 200),
  calories: optionalNumber("Calories", 0, 10000, true),
});

export const waterSchema = z.object({
  date: isoDate,
  amount: requiredNumber("Amount", 1, 5000),
});

export const metricsSchema = z
  .object({
    date: isoDate,
    weight: optionalNumber("Weight", 1, 1500),
    steps: optionalNumber("Steps", 0, 200000, true),
    sleepHours: optionalNumber("Sleep", 0, 24),
  })
  .refine((d) => d.weight !== null || d.steps !== null || d.sleepHours !== null, {
    error: "Enter at least one measurement.",
    path: ["weight"],
  });

export const habitSchema = z.object({
  name: requiredText("Habit name", 60),
  color: tone,
  targetPerWeek: requiredNumber("Days per week", 1, 7, true),
});
