"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { parseTimeInput } from "@/lib/dates";
import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { moodSchema } from "@/lib/schemas";
import { requireUser } from "@/server/auth/current-user";
import { deleteMood, upsertMood } from "@/server/data/mood";
import { setMoodReminderTime } from "@/server/data/users";

export async function saveMoodAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(moodSchema, formData, { arrays: ["emotions"] });
  if (!parsed.ok) return parsed.state;
  await upsertMood(user.id, parsed.data);
  refresh();
  return success("Check-in saved. Thanks for taking a moment for yourself.");
}

export async function deleteMoodAction(moodId: string): Promise<void> {
  const user = await requireUser();
  await deleteMood(user.id, z.string().min(1).max(64).parse(moodId));
  refresh();
}

export async function saveMoodReminderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formData.get("time");
  const time = typeof raw === "string" && raw !== "" ? raw : null;
  if (time !== null && parseTimeInput(time) === null) {
    return failure("Enter a valid time.", { fieldErrors: { time: "Enter a valid time." } });
  }
  await setMoodReminderTime(user.id, time);
  refresh();
  return success(time ? "Daily check-in reminder set." : "Daily check-in reminder turned off.");
}
