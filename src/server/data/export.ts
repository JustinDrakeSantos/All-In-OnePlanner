import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  events,
  habitCheckins,
  habits,
  healthMetrics,
  journalEntries,
  meals,
  moodEntries,
  taskLists,
  tasks,
  users,
  waterLogs,
  workouts,
} from "@/server/db/schema";

/** Everything the user owns, as plain JSON. Password hashes and sessions are excluded. */
export async function exportUserData(userId: string) {
  const [
    [profile],
    userTaskLists,
    userTasks,
    userEvents,
    userJournal,
    userMoods,
    userWorkouts,
    userMeals,
    userWater,
    userMetrics,
    userHabits,
    userCheckins,
  ] = await Promise.all([
    db
      .select({
        email: users.email,
        name: users.name,
        timezone: users.timezone,
        unitSystem: users.unitSystem,
        waterGoalMl: users.waterGoalMl,
        stepGoal: users.stepGoal,
        moodReminderTime: users.moodReminderTime,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId)),
    db.select().from(taskLists).where(eq(taskLists.userId, userId)),
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(events).where(eq(events.userId, userId)),
    db.select().from(journalEntries).where(eq(journalEntries.userId, userId)),
    db.select().from(moodEntries).where(eq(moodEntries.userId, userId)),
    db.select().from(workouts).where(eq(workouts.userId, userId)),
    db.select().from(meals).where(eq(meals.userId, userId)),
    db.select().from(waterLogs).where(eq(waterLogs.userId, userId)),
    db.select().from(healthMetrics).where(eq(healthMetrics.userId, userId)),
    db.select().from(habits).where(eq(habits.userId, userId)),
    db.select().from(habitCheckins).where(eq(habitCheckins.userId, userId)),
  ]);

  return {
    format: "all-in-planner-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    taskLists: userTaskLists,
    tasks: userTasks,
    events: userEvents,
    journalEntries: userJournal.map((e) => ({ ...e, tags: e.tags.split(",").filter(Boolean) })),
    moodEntries: userMoods.map((m) => ({ ...m, emotions: m.emotions.split(",").filter(Boolean) })),
    workouts: userWorkouts,
    meals: userMeals,
    waterLogs: userWater,
    healthMetrics: userMetrics,
    habits: userHabits,
    habitCheckins: userCheckins,
  };
}
