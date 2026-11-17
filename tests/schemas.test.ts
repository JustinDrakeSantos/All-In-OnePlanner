import { describe, expect, it } from "vitest";
import {
  eventSchema,
  journalSchema,
  metricsSchema,
  moodSchema,
  normalizeTags,
  signupSchema,
  taskSchema,
  workoutSchema,
} from "@/lib/schemas";
import { parseForm } from "@/lib/forms";

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
};

describe("eventSchema", () => {
  const base = { title: "Standup", date: "2025-03-08", color: "glacier", reminder: "" };

  it("turns times into minutes", () => {
    const parsed = eventSchema.parse({ ...base, startTime: "13:30", endTime: "14:15" });
    expect(parsed).toMatchObject({ startMinute: 810, endMinute: 855, allDay: false, reminderMinutes: null });
  });

  it("spans the whole day for all-day events", () => {
    const parsed = eventSchema.parse({ ...base, allDay: "on", startTime: "", endTime: "", reminder: "1440" });
    expect(parsed).toMatchObject({ startMinute: 0, endMinute: 1440, allDay: true, reminderMinutes: 1440 });
  });

  it("rejects an end time before the start", () => {
    const result = eventSchema.safeParse({ ...base, startTime: "10:00", endTime: "09:00" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["endTime"] });
  });

  it("rejects colors outside the palette and unknown reminders", () => {
    expect(eventSchema.safeParse({ ...base, startTime: "09:00", endTime: "10:00", color: "#2563EB" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, startTime: "09:00", endTime: "10:00", reminder: "7" }).success).toBe(false);
  });
});

describe("account forms", () => {
  it("normalizes email and requires matching passwords", () => {
    const ok = parseForm(
      signupSchema,
      form({ name: "Sam", email: "  Sam@Example.COM ", password: "longenough", confirmPassword: "longenough", timezone: "America/Los_Angeles" }),
    );
    expect(ok.ok && ok.data.email).toBe("sam@example.com");

    const mismatch = parseForm(
      signupSchema,
      form({ name: "Sam", email: "sam@example.com", password: "longenough", confirmPassword: "different", timezone: "" }),
      { secret: ["password", "confirmPassword"] },
    );
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok && mismatch.state.status === "error") {
      expect(mismatch.state.fieldErrors?.confirmPassword).toMatch(/match/);
      expect(mismatch.state.values).not.toHaveProperty("password");
      expect(mismatch.state.values?.email).toBe("sam@example.com");
    }
  });

  it("falls back to UTC for a missing time zone and rejects a bogus one", () => {
    const base = { name: "Sam", email: "a@b.co", password: "longenough", confirmPassword: "longenough" };
    expect(signupSchema.parse({ ...base, timezone: "" }).timezone).toBe("UTC");
    expect(signupSchema.safeParse({ ...base, timezone: "Mars/Olympus" }).success).toBe(false);
  });
});

describe("tasks, journal, mood, metrics", () => {
  it("treats blank optional task fields as empty", () => {
    const parsed = taskSchema.parse({ title: " Read ", notes: "", dueDate: "", priority: "high", listId: "", recurrence: "", status: "" });
    expect(parsed).toEqual({ title: "Read", notes: null, dueDate: null, priority: "high", listId: null, recurrence: "none", status: "todo" });
  });

  it("accepts the quick-add form, which omits notes, repeats, and status entirely", () => {
    const result = parseForm(taskSchema, form({ title: "Buy milk", dueDate: "2025-03-08", priority: "medium", listId: "" }));
    expect(result.ok && result.data).toEqual({
      title: "Buy milk",
      notes: null,
      dueDate: "2025-03-08",
      priority: "medium",
      listId: null,
      recurrence: "none",
      status: "todo",
    });
  });

  it("accepts a workout with only the required fields", () => {
    const result = parseForm(workoutSchema, form({ type: "run", date: "2025-03-08", durationMin: "30", intensity: "moderate" }));
    expect(result.ok && result.data).toMatchObject({ title: null, distance: null, calories: null, planned: false });
  });

  it("normalizes journal tags", () => {
    expect(normalizeTags("Work, #Gratitude, self care, work,,  ")).toEqual(["work", "gratitude", "self-care"]);
    const parsed = journalSchema.parse({ date: "2025-03-08", kind: "entry", title: "", body: "Hello", prompt: "", tags: "a,b" });
    expect(parsed.title).toBe("Untitled entry");
    expect(parsed.tags).toEqual(["a", "b"]);
  });

  it("keeps only known emotions", () => {
    const result = parseForm(moodSchema, form({ date: "2025-03-08", mood: "4", emotions: ["calm", "<script>", "proud"] }), {
      arrays: ["emotions"],
    });
    expect(result.ok && result.data).toMatchObject({ mood: 4, energy: null, emotions: ["calm", "proud"] });
  });

  it("requires at least one health measurement", () => {
    expect(metricsSchema.safeParse({ date: "2025-03-08", weight: "", steps: "", sleepHours: "" }).success).toBe(false);
    expect(metricsSchema.parse({ date: "2025-03-08", weight: "", steps: "9000", sleepHours: "" }).steps).toBe(9000);
  });
});
