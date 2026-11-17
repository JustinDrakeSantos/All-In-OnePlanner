import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  contactMessages,
  events,
  habitCheckins,
  habits,
  healthMetrics,
  journalEntries,
  meals,
  moodEntries,
  passwordResetTokens,
  sessions,
  taskLists,
  tasks,
  users,
  waterLogs,
  workouts,
  type User,
} from "@/server/db/schema";
import { DEFAULT_TASK_LISTS } from "@/lib/constants";
import { generateToken, hashToken } from "@/server/auth/tokens";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

/** Creates the account plus starter task lists. Returns null if the email is taken. */
export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  timezone: string;
}): Promise<User | null> {
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(users).values({ id, ...input }),
      db.insert(taskLists).values(DEFAULT_TASK_LISTS.map((list) => ({ userId: id, ...list }))),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed: users.email")) return null;
    throw error;
  }
  return findUserById(id);
}

export async function updateProfile(
  userId: string,
  data: Pick<User, "name" | "timezone" | "unitSystem" | "waterGoalMl" | "stepGoal" | "moodReminderTime">,
): Promise<void> {
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function setMoodReminderTime(userId: string, time: string | null): Promise<void> {
  await db.update(users).set({ moodReminderTime: time }).where(eq(users.id, userId));
}

export async function setPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

/** Permanently removes the account and everything it owns, in one transaction. */
export async function deleteUserAndData(userId: string): Promise<void> {
  await db.batch([
    db.delete(habitCheckins).where(eq(habitCheckins.userId, userId)),
    db.delete(habits).where(eq(habits.userId, userId)),
    db.delete(healthMetrics).where(eq(healthMetrics.userId, userId)),
    db.delete(waterLogs).where(eq(waterLogs.userId, userId)),
    db.delete(meals).where(eq(meals.userId, userId)),
    db.delete(workouts).where(eq(workouts.userId, userId)),
    db.delete(moodEntries).where(eq(moodEntries.userId, userId)),
    db.delete(journalEntries).where(eq(journalEntries.userId, userId)),
    db.delete(events).where(eq(events.userId, userId)),
    db.delete(tasks).where(eq(tasks.userId, userId)),
    db.delete(taskLists).where(eq(taskLists.userId, userId)),
    db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)),
    db.delete(sessions).where(eq(sessions.userId, userId)),
    db.delete(users).where(eq(users.id, userId)),
  ]);
}

/** Issues a one-hour, single-use reset token; earlier tokens for the user stop working. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.batch([
    db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)),
    db.insert(passwordResetTokens).values({
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    }),
  ]);
  return token;
}

/** Marks the token used and returns its user, or null if invalid, expired, or already used. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.id, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: passwordResetTokens.userId });
  return row?.userId ?? null;
}

export async function saveContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  await db.insert(contactMessages).values(input);
}
