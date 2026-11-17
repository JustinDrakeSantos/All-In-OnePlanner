import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lte, or } from "drizzle-orm";
import { db } from "@/server/db";
import { events, type CalendarEvent } from "@/server/db/schema";
import type { ISODate } from "@/lib/dates";
import type { ImportedEvent } from "@/lib/legacy-import";

export interface EventInput {
  title: string;
  date: ISODate;
  allDay: boolean;
  startMinute: number;
  endMinute: number;
  color: string;
  location: string | null;
  notes: string | null;
  reminderMinutes: number | null;
}

const ordering = [asc(events.date), desc(events.allDay), asc(events.startMinute), asc(events.endMinute)];

export function listEventsBetween(userId: string, from: ISODate, to: ISODate): Promise<CalendarEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), gte(events.date, from), lte(events.date, to)))
    .orderBy(...ordering);
}

/** Events that haven't ended yet, starting from `today` at `nowMinute`. */
export function upcomingEvents(userId: string, today: ISODate, nowMinute: number, limit = 6): Promise<CalendarEvent[]> {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        or(gt(events.date, today), and(eq(events.date, today), gt(events.endMinute, nowMinute))),
      ),
    )
    .orderBy(...ordering)
    .limit(limit);
}

export function eventsWithRemindersBetween(userId: string, from: ISODate, to: ISODate) {
  return db
    .select()
    .from(events)
    .where(
      and(eq(events.userId, userId), gte(events.date, from), lte(events.date, to), isNotNull(events.reminderMinutes)),
    );
}

export async function createEvent(userId: string, input: EventInput): Promise<CalendarEvent> {
  const [event] = await db.insert(events).values({ userId, ...input }).returning();
  return event;
}

export async function updateEvent(userId: string, id: string, input: EventInput): Promise<CalendarEvent | null> {
  const [event] = await db
    .update(events)
    .set(input)
    .where(and(eq(events.id, id), eq(events.userId, userId)))
    .returning();
  return event ?? null;
}

export async function deleteEvent(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, userId)))
    .returning({ id: events.id });
  return deleted.length > 0;
}

/** Imports events from the original app, skipping exact duplicates already on the calendar. */
export async function importEvents(userId: string, incoming: ImportedEvent[]): Promise<{ added: number; duplicates: number }> {
  if (incoming.length === 0) return { added: 0, duplicates: 0 };
  const key = (e: Pick<ImportedEvent, "title" | "date" | "startMinute" | "endMinute">) =>
    `${e.title}\u0000${e.date}\u0000${e.startMinute}\u0000${e.endMinute}`;

  const dates = [...new Set(incoming.map((e) => e.date))];
  const seen = new Set<string>();
  for (let i = 0; i < dates.length; i += 500) {
    const existing = await db
      .select({ title: events.title, date: events.date, startMinute: events.startMinute, endMinute: events.endMinute })
      .from(events)
      .where(and(eq(events.userId, userId), inArray(events.date, dates.slice(i, i + 500))));
    existing.forEach((e) => seen.add(key(e)));
  }

  const fresh: ImportedEvent[] = [];
  for (const event of incoming) {
    const k = key(event);
    if (seen.has(k)) continue;
    seen.add(k);
    fresh.push(event);
  }

  for (let i = 0; i < fresh.length; i += 200) {
    await db.insert(events).values(
      fresh.slice(i, i + 200).map((e) => ({ userId, ...e, location: null, notes: null, reminderMinutes: null })),
    );
  }
  return { added: fresh.length, duplicates: incoming.length - fresh.length };
}
