import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { readSessionToken } from "./session";
import { validateSessionToken } from "@/server/data/sessions";
import type { User } from "@/server/db/schema";

/** The fields the UI is allowed to see. Never includes the password hash. */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
  unitSystem: User["unitSystem"];
  waterGoalMl: number;
  stepGoal: number;
  moodReminderTime: string | null;
}

export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    unitSystem: user.unitSystem,
    waterGoalMl: user.waterGoalMl,
    stepGoal: user.stepGoal,
    moodReminderTime: user.moodReminderTime,
  };
}

/**
 * Reads and validates the session once per request.
 *
 * `connection()` keeps everything after it out of prerendering: validating a
 * session compares its expiry with the current time, and personal data is
 * always rendered fresh for the actual request rather than cached.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();
  const token = await readSessionToken();
  if (!token) return null;
  const user = await validateSessionToken(token);
  return user ? toCurrentUser(user) : null;
});

/**
 * Returns the signed-in user or redirects. A stale cookie goes through
 * /auth/clear-session so it gets deleted (Server Components can't delete cookies).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;
  const token = await readSessionToken();
  redirect(token ? "/auth/clear-session" : "/login");
}
