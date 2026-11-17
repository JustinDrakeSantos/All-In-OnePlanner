import { addDays, addMonths, type ISODate } from "./dates";

/**
 * Consecutive days ending today. If today has no activity yet, the streak is
 * still alive when yesterday had activity (it isn't broken until the day ends).
 */
export function currentStreak(days: Iterable<ISODate>, today: ISODate): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function longestStreak(days: Iterable<ISODate>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: ISODate | null = null;
  for (const day of sorted) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

/**
 * The next due date for a recurring task. Repeats from the due date when there
 * is one, otherwise from the completion day, and never lands in the past.
 */
export function nextOccurrence(
  recurrence: Exclude<Recurrence, "none">,
  dueDate: ISODate | null,
  completedOn: ISODate,
): ISODate {
  const step = (date: ISODate) =>
    recurrence === "daily"
      ? addDays(date, 1)
      : recurrence === "weekly"
        ? addDays(date, 7)
        : addMonths(date, 1);

  let next = step(dueDate ?? completedOn);
  while (next <= completedOn) next = step(next);
  return next;
}
