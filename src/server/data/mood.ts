import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { moodEntries, type MoodEntry } from "@/server/db/schema";
import type { ISODate } from "@/lib/dates";

export interface MoodInput {
  date: ISODate;
  mood: number;
  energy: number | null;
  emotions: string[];
  note: string | null;
}

export type MoodView = Omit<MoodEntry, "emotions"> & { emotions: string[] };

const toView = (entry: MoodEntry): MoodView => ({ ...entry, emotions: entry.emotions.split(",").filter(Boolean) });

/** One check-in per day: logging again for the same day updates it. */
export async function upsertMood(userId: string, input: MoodInput): Promise<MoodView> {
  const values = { ...input, emotions: input.emotions.join(",") };
  const [entry] = await db
    .insert(moodEntries)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [moodEntries.userId, moodEntries.date],
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return toView(entry);
}

export async function moodOn(userId: string, date: ISODate): Promise<MoodView | null> {
  const [entry] = await db
    .select()
    .from(moodEntries)
    .where(and(eq(moodEntries.userId, userId), eq(moodEntries.date, date)))
    .limit(1);
  return entry ? toView(entry) : null;
}

export async function moodsBetween(userId: string, from: ISODate, to: ISODate): Promise<MoodView[]> {
  const rows = await db
    .select()
    .from(moodEntries)
    .where(and(eq(moodEntries.userId, userId), gte(moodEntries.date, from), lte(moodEntries.date, to)))
    .orderBy(asc(moodEntries.date));
  return rows.map(toView);
}

export async function recentMoods(userId: string, limit = 30): Promise<MoodView[]> {
  const rows = await db
    .select()
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .orderBy(desc(moodEntries.date))
    .limit(limit);
  return rows.map(toView);
}

export async function deleteMood(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(moodEntries)
    .where(and(eq(moodEntries.id, id), eq(moodEntries.userId, userId)))
    .returning({ id: moodEntries.id });
  return deleted.length > 0;
}

/** Averages and frequencies for the trends panel. */
export function summarizeMoods(entries: MoodView[]) {
  if (entries.length === 0) return null;
  const average = entries.reduce((sum, e) => sum + e.mood, 0) / entries.length;
  const energyEntries = entries.filter((e) => e.energy !== null);
  const averageEnergy = energyEntries.length
    ? energyEntries.reduce((sum, e) => sum + (e.energy ?? 0), 0) / energyEntries.length
    : null;

  const emotionCounts = new Map<string, number>();
  for (const e of entries) for (const emotion of e.emotions) emotionCounts.set(emotion, (emotionCounts.get(emotion) ?? 0) + 1);
  const topEmotions = [...emotionCounts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count }));

  const weekday = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
  for (const e of entries) {
    const day = new Date(`${e.date}T00:00:00Z`).getUTCDay();
    weekday[day].total += e.mood;
    weekday[day].count += 1;
  }
  return {
    average,
    averageEnergy,
    topEmotions,
    byWeekday: weekday.map((w) => (w.count ? w.total / w.count : null)),
  };
}
