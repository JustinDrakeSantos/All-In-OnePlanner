import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { habitCheckins, habits, type Habit } from "@/server/db/schema";
import type { ISODate } from "@/lib/dates";

export async function createHabit(
  userId: string,
  input: { name: string; color: string; targetPerWeek: number },
): Promise<Habit> {
  const [habit] = await db.insert(habits).values({ userId, ...input }).returning();
  return habit;
}

export function listHabits(userId: string): Promise<Habit[]> {
  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.archived, false)))
    .orderBy(asc(habits.createdAt));
}

export async function deleteHabit(userId: string, id: string): Promise<boolean> {
  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .limit(1);
  if (!habit) return false;
  await db.batch([
    db.delete(habitCheckins).where(and(eq(habitCheckins.habitId, id), eq(habitCheckins.userId, userId))),
    db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId))),
  ]);
  return true;
}

/** Map of habitId → set of dates it was done, between `from` and `to`. */
export async function checkinsBetween(userId: string, from: ISODate, to: ISODate): Promise<Map<string, Set<ISODate>>> {
  const rows = await db
    .select({ habitId: habitCheckins.habitId, date: habitCheckins.date })
    .from(habitCheckins)
    .where(and(eq(habitCheckins.userId, userId), gte(habitCheckins.date, from), lte(habitCheckins.date, to)));
  const map = new Map<string, Set<ISODate>>();
  for (const row of rows) {
    if (!map.has(row.habitId)) map.set(row.habitId, new Set());
    map.get(row.habitId)!.add(row.date);
  }
  return map;
}

/** Checks a habit off for a day, or un-checks it. Returns the new state, or null if the habit isn't the user's. */
export async function toggleCheckin(userId: string, habitId: string, date: ISODate): Promise<boolean | null> {
  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  if (!habit) return null;

  const removed = await db
    .delete(habitCheckins)
    .where(and(eq(habitCheckins.habitId, habitId), eq(habitCheckins.date, date), eq(habitCheckins.userId, userId)))
    .returning({ date: habitCheckins.date });
  if (removed.length > 0) return false;

  await db.insert(habitCheckins).values({ habitId, userId, date }).onConflictDoNothing();
  return true;
}
