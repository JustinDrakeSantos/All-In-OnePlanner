import "server-only";
import { addDays, formatMinutes, parseTimeInput, todayInTimeZone, zonedTimeToInstant } from "@/lib/dates";
import { eventsWithRemindersBetween } from "./events";
import { moodOn } from "./mood";
import type { CurrentUser } from "@/server/auth/current-user";

export interface Reminder {
  id: string;
  title: string;
  body: string;
  /** ISO instant when the reminder should fire. */
  at: string;
  href: string;
}

/** All-day events have no start time, so their reminders count back from 9:00 AM. */
export const ALL_DAY_REMINDER_MINUTE = 9 * 60;

/** Reminders due in the next 24 hours (and the last minute, so none are missed on reload). */
export async function upcomingReminders(user: CurrentUser, now: Date = new Date()): Promise<Reminder[]> {
  const today = todayInTimeZone(user.timezone, now);
  const horizon = now.getTime() + 24 * 60 * 60 * 1000;
  const reminders: Reminder[] = [];

  const events = await eventsWithRemindersBetween(user.id, today, addDays(today, 2));
  for (const event of events) {
    const reference = event.allDay ? ALL_DAY_REMINDER_MINUTE : event.startMinute;
    const startsAt = zonedTimeToInstant(event.date, reference, user.timezone);
    const at = startsAt.getTime() - (event.reminderMinutes ?? 0) * 60_000;
    if (at < now.getTime() - 60_000 || at > horizon) continue;
    reminders.push({
      id: `event:${event.id}:${at}`,
      title: event.title,
      body: event.allDay ? "All day" : `Starts at ${formatMinutes(event.startMinute)}${event.location ? ` · ${event.location}` : ""}`,
      at: new Date(at).toISOString(),
      href: `/calendar?view=day&date=${event.date}`,
    });
  }

  const checkInMinute = user.moodReminderTime ? parseTimeInput(user.moodReminderTime) : null;
  if (checkInMinute !== null && !(await moodOn(user.id, today))) {
    let at = zonedTimeToInstant(today, checkInMinute, user.timezone).getTime();
    if (at < now.getTime() - 60_000) at = zonedTimeToInstant(addDays(today, 1), checkInMinute, user.timezone).getTime();
    if (at <= horizon) {
      reminders.push({
        id: `mood:${new Date(at).toISOString().slice(0, 10)}`,
        title: "How are you feeling?",
        body: "Take a moment for your daily mood check-in.",
        at: new Date(at).toISOString(),
        href: "/mood",
      });
    }
  }

  return reminders.sort((a, b) => a.at.localeCompare(b.at));
}
