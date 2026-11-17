"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { changePasswordSchema, deleteAccountSchema, legacyEventsSchema, profileSchema } from "@/lib/schemas";
import { volumeToMl } from "@/lib/units";
import { requireUser } from "@/server/auth/current-user";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { endSession, readSessionToken } from "@/server/auth/session";
import { importEvents } from "@/server/data/events";
import { deleteUserSessions } from "@/server/data/sessions";
import { deleteUserAndData, findUserById, setPasswordHash, updateProfile } from "@/server/data/users";
import { rateLimit } from "@/server/rate-limit";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  // The water goal is entered in the units being saved, so convert with the new choice.
  await updateProfile(user.id, {
    name: d.name,
    timezone: d.timezone,
    unitSystem: d.unitSystem,
    waterGoalMl: volumeToMl(d.waterGoal, d.unitSystem),
    stepGoal: d.stepGoal,
    moodReminderTime: d.moodReminderTime,
  });
  refresh();
  return success("Settings saved.");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(changePasswordSchema, formData, { secret: ["currentPassword", "password", "confirmPassword"] });
  if (!parsed.ok) return parsed.state;

  const limit = rateLimit(`password:${user.id}`, 8, 15 * 60 * 1000);
  if (!limit.ok) return failure("Too many attempts. Please wait a few minutes.");

  const record = await findUserById(user.id);
  if (!record || !(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return failure("Please fix the highlighted fields.", { fieldErrors: { currentPassword: "That isn't your current password." } });
  }
  await setPasswordHash(user.id, await hashPassword(parsed.data.password));
  // Sign out every other device; keep this one.
  await deleteUserSessions(user.id, await readSessionToken());
  return success("Password changed. Other devices have been signed out.");
}

export async function importLegacyEventsAction(
  events: unknown,
): Promise<{ ok: true; added: number; duplicates: number } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = legacyEventsSchema.safeParse(events);
  if (!parsed.success) return { ok: false, error: "Some events weren't in the expected format, so nothing was imported." };
  const result = await importEvents(user.id, parsed.data);
  refresh();
  return { ok: true, ...result };
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(deleteAccountSchema, formData, { secret: ["password"] });
  if (!parsed.ok) return parsed.state;

  const limit = rateLimit(`delete:${user.id}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return failure("Too many attempts. Please wait a few minutes.");

  const record = await findUserById(user.id);
  if (!record || !(await verifyPassword(parsed.data.password, record.passwordHash))) {
    return failure("Please fix the highlighted fields.", { fieldErrors: { password: "That password is incorrect." }, values: { confirm: "DELETE" } });
  }
  await deleteUserAndData(user.id);
  await endSession();
  redirect("/?account=deleted");
}
