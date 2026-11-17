import "server-only";
import { and, asc, desc, eq, gte, lte, sum } from "drizzle-orm";
import { db } from "@/server/db";
import {
  healthMetrics,
  meals,
  waterLogs,
  workouts,
  type HealthMetric,
  type Meal,
  type Workout,
} from "@/server/db/schema";
import type { ISODate } from "@/lib/dates";

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export interface WorkoutInput {
  date: ISODate;
  type: Workout["type"];
  title: string;
  durationMin: number;
  intensity: Workout["intensity"];
  distanceKm: number | null;
  calories: number | null;
  notes: string | null;
  completed: boolean;
}

export async function createWorkout(userId: string, input: WorkoutInput): Promise<Workout> {
  const [workout] = await db.insert(workouts).values({ userId, ...input }).returning();
  return workout;
}

export async function setWorkoutCompleted(userId: string, id: string, completed: boolean): Promise<boolean> {
  const updated = await db
    .update(workouts)
    .set({ completed })
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });
  return updated.length > 0;
}

export async function deleteWorkout(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });
  return deleted.length > 0;
}

export function workoutsBetween(userId: string, from: ISODate, to: ISODate): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.date, from), lte(workouts.date, to)))
    .orderBy(desc(workouts.date), desc(workouts.createdAt));
}

export function plannedWorkouts(userId: string, from: ISODate, limit = 10): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.completed, false), gte(workouts.date, from)))
    .orderBy(asc(workouts.date))
    .limit(limit);
}

export function recentWorkouts(userId: string, limit = 20): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.completed, true)))
    .orderBy(desc(workouts.date), desc(workouts.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Meals & water
// ---------------------------------------------------------------------------

export async function addMeal(
  userId: string,
  input: { date: ISODate; mealType: Meal["mealType"]; description: string; calories: number | null },
): Promise<void> {
  await db.insert(meals).values({ userId, ...input });
}

export async function deleteMeal(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(meals)
    .where(and(eq(meals.id, id), eq(meals.userId, userId)))
    .returning({ id: meals.id });
  return deleted.length > 0;
}

export function mealsOn(userId: string, date: ISODate): Promise<Meal[]> {
  return db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), eq(meals.date, date)))
    .orderBy(asc(meals.createdAt));
}

export async function addWater(userId: string, date: ISODate, amountMl: number): Promise<void> {
  await db.insert(waterLogs).values({ userId, date, amountMl });
}

/** Removes the most recent water log for the day (an "undo"). */
export async function undoLastWater(userId: string, date: ISODate): Promise<boolean> {
  const [last] = await db
    .select({ id: waterLogs.id })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.date, date)))
    .orderBy(desc(waterLogs.createdAt))
    .limit(1);
  if (!last) return false;
  await db.delete(waterLogs).where(and(eq(waterLogs.id, last.id), eq(waterLogs.userId, userId)));
  return true;
}

export async function waterTotalsBetween(userId: string, from: ISODate, to: ISODate): Promise<Map<ISODate, number>> {
  const rows = await db
    .select({ date: waterLogs.date, total: sum(waterLogs.amountMl) })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), gte(waterLogs.date, from), lte(waterLogs.date, to)))
    .groupBy(waterLogs.date);
  return new Map(rows.map((r) => [r.date, Number(r.total ?? 0)]));
}

// ---------------------------------------------------------------------------
// Health metrics (one row per day; logging again fills in or replaces values)
// ---------------------------------------------------------------------------

export async function upsertMetrics(
  userId: string,
  input: { date: ISODate; weightKg: number | null; steps: number | null; sleepHours: number | null },
): Promise<void> {
  // Only overwrite the measurements that were actually entered.
  const provided = Object.fromEntries(
    Object.entries({ weightKg: input.weightKg, steps: input.steps, sleepHours: input.sleepHours }).filter(
      ([, v]) => v !== null,
    ),
  );
  await db
    .insert(healthMetrics)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: [healthMetrics.userId, healthMetrics.date],
      set: { ...provided, updatedAt: new Date() },
    });
}

export function metricsBetween(userId: string, from: ISODate, to: ISODate): Promise<HealthMetric[]> {
  return db
    .select()
    .from(healthMetrics)
    .where(and(eq(healthMetrics.userId, userId), gte(healthMetrics.date, from), lte(healthMetrics.date, to)))
    .orderBy(asc(healthMetrics.date));
}

export async function deleteMetrics(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(healthMetrics)
    .where(and(eq(healthMetrics.id, id), eq(healthMetrics.userId, userId)))
    .returning({ id: healthMetrics.id });
  return deleted.length > 0;
}

export async function latestWeight(userId: string): Promise<HealthMetric | null> {
  const rows = await db
    .select()
    .from(healthMetrics)
    .where(eq(healthMetrics.userId, userId))
    .orderBy(desc(healthMetrics.date))
    .limit(60);
  return rows.find((r) => r.weightKg !== null) ?? null;
}
