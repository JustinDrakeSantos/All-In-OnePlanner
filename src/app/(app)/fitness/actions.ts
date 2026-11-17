"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { WORKOUT_TYPE_LABELS } from "@/lib/constants";
import { isISODate } from "@/lib/dates";
import { parseForm, success, type FormState } from "@/lib/forms";
import { habitSchema, mealSchema, metricsSchema, waterSchema, workoutSchema } from "@/lib/schemas";
import { distanceToKm, volumeToMl, weightToKg } from "@/lib/units";
import { requireUser } from "@/server/auth/current-user";
import {
  addMeal,
  addWater,
  createWorkout,
  deleteMeal,
  deleteWorkout,
  setWorkoutCompleted,
  undoLastWater,
  upsertMetrics,
} from "@/server/data/fitness";
import { createHabit, deleteHabit, toggleCheckin } from "@/server/data/habits";
import { userClock } from "@/server/today";

const idSchema = z.string().min(1).max(64);
const dateSchema = z.string().refine(isISODate);

// Workouts -------------------------------------------------------------------

export async function logWorkoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(workoutSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { today } = userClock(user);
  const d = parsed.data;
  const completed = !d.planned && d.date <= today;
  await createWorkout(user.id, {
    date: d.date,
    type: d.type,
    title: d.title ?? WORKOUT_TYPE_LABELS[d.type],
    durationMin: d.durationMin,
    intensity: d.intensity,
    distanceKm: d.distance === null ? null : distanceToKm(d.distance, user.unitSystem),
    calories: d.calories,
    notes: d.notes,
    completed,
  });
  refresh();
  return success(completed ? "Workout logged. Nice work!" : "Workout planned.");
}

export async function setWorkoutDoneAction(workoutId: string, done: boolean): Promise<void> {
  const user = await requireUser();
  await setWorkoutCompleted(user.id, idSchema.parse(workoutId), z.boolean().parse(done));
  refresh();
}

export async function deleteWorkoutAction(workoutId: string): Promise<void> {
  const user = await requireUser();
  await deleteWorkout(user.id, idSchema.parse(workoutId));
  refresh();
}

// Meals & water -------------------------------------------------------------

export async function addMealAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(mealSchema, formData);
  if (!parsed.ok) return parsed.state;
  await addMeal(user.id, parsed.data);
  refresh();
  return success("Meal added.");
}

export async function deleteMealAction(mealId: string): Promise<void> {
  const user = await requireUser();
  await deleteMeal(user.id, idSchema.parse(mealId));
  refresh();
}

/** One-tap water buttons; `amount` is in the user's units. */
export async function quickAddWaterAction(date: string, amount: number): Promise<void> {
  const user = await requireUser();
  const value = z.number().positive().max(5000).parse(amount);
  await addWater(user.id, dateSchema.parse(date), volumeToMl(value, user.unitSystem));
  refresh();
}

export async function addWaterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(waterSchema, formData);
  if (!parsed.ok) return parsed.state;
  await addWater(user.id, parsed.data.date, volumeToMl(parsed.data.amount, user.unitSystem));
  refresh();
  return success("Water added.");
}

export async function undoWaterAction(date: string): Promise<void> {
  const user = await requireUser();
  await undoLastWater(user.id, dateSchema.parse(date));
  refresh();
}

// Health metrics ------------------------------------------------------------

export async function logMetricsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(metricsSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { date, weight, steps, sleepHours } = parsed.data;
  await upsertMetrics(user.id, {
    date,
    weightKg: weight === null ? null : weightToKg(weight, user.unitSystem),
    steps,
    sleepHours,
  });
  refresh();
  return success("Saved.");
}

// Habits --------------------------------------------------------------------

export async function createHabitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(habitSchema, formData);
  if (!parsed.ok) return parsed.state;
  await createHabit(user.id, parsed.data);
  refresh();
  return success(`Started tracking “${parsed.data.name}”.`);
}

export async function toggleHabitAction(habitId: string, date: string): Promise<void> {
  const user = await requireUser();
  const result = await toggleCheckin(user.id, idSchema.parse(habitId), dateSchema.parse(date));
  if (result === null) throw new Error("Habit not found");
  refresh();
}

export async function deleteHabitAction(habitId: string): Promise<void> {
  const user = await requireUser();
  await deleteHabit(user.id, idSchema.parse(habitId));
  refresh();
}
