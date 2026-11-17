/**
 * Calendar-date helpers built on "YYYY-MM-DD" strings.
 *
 * The original app stored dates as local-midnight timestamps and parsed form
 * dates as UTC, which put events on the wrong day for anyone at or east of
 * UTC. Here a calendar day is plain text. Arithmetic happens on UTC-midnight
 * Date objects, so the host machine's time zone never leaks in, and "today"
 * is always computed for an explicit IANA time zone.
 */

export type ISODate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toUTC(iso: ISODate): Date {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new RangeError(`Invalid ISO date: ${iso}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function fromUTC(date: Date): ISODate {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = toUTC(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUTC(date);
}

/** Adds months, clamping to the last day of the target month (Jan 31 + 1 → Feb 28/29). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const date = toUTC(iso);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUTC(target);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(iso: ISODate): number {
  return toUTC(iso).getUTCDay();
}

export function startOfWeek(iso: ISODate, weekStartsOn = 0): ISODate {
  const diff = (dayOfWeek(iso) - weekStartsOn + 7) % 7;
  return addDays(iso, -diff);
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 8)}01`;
}

export function endOfMonth(iso: ISODate): ISODate {
  const first = toUTC(startOfMonth(iso));
  return fromUTC(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / DAY_MS);
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const days = daysBetween(from, to);
  return days < 0 ? [] : Array.from({ length: days + 1 }, (_, i) => addDays(from, i));
}

export function weekDays(iso: ISODate, weekStartsOn = 0): ISODate[] {
  const start = startOfWeek(iso, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Full weeks covering the month of `iso`: 28, 35, or 42 days. */
export function monthGrid(iso: ISODate, weekStartsOn = 0): ISODate[] {
  const start = startOfWeek(startOfMonth(iso), weekStartsOn);
  const end = addDays(startOfWeek(endOfMonth(iso), weekStartsOn), 6);
  return dateRange(start, end);
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

// ---------------------------------------------------------------------------
// Time zones
// ---------------------------------------------------------------------------

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** The calendar date it is right now in `timeZone`. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): ISODate {
  const p = zonedParts(timeZone, now);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes since local midnight right now in `timeZone`. */
export function minutesNowInTimeZone(timeZone: string, now: Date = new Date()): number {
  const p = zonedParts(timeZone, now);
  return p.hour * 60 + p.minute;
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (local − UTC). */
function timeZoneOffsetMs(timeZone: string, instant: Date): number {
  const p = zonedParts(timeZone, instant);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant at which the wall clock in `timeZone` reads `iso` + `minutes`. */
export function zonedTimeToInstant(iso: ISODate, minutes: number, timeZone: string): Date {
  const date = toUTC(iso);
  const wallClockAsUTC = date.getTime() + minutes * 60_000;
  const firstGuess = wallClockAsUTC - timeZoneOffsetMs(timeZone, new Date(wallClockAsUTC));
  const corrected = wallClockAsUTC - timeZoneOffsetMs(timeZone, new Date(firstGuess));
  return new Date(corrected);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatDate(
  iso: ISODate,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(toUTC(iso));
}

export function formatLongDate(iso: ISODate): string {
  return formatDate(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "Today", "Tomorrow", "Yesterday", or a short date. */
export function relativeDayLabel(iso: ISODate, today: ISODate): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return formatDate(
    iso,
    sameYear
      ? { weekday: "short", month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}

/** 0 → "12:00 AM", 810 → "1:30 PM", 1440 → "12:00 AM" (midnight at the end of the day). */
export function formatMinutes(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(m / 60);
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(m % 60)} ${suffix}`;
}

export function formatTimeRange(start: number, end: number): string {
  return `${formatMinutes(start)} – ${formatMinutes(end)}`;
}

/** "HH:MM" (24-hour) → minutes, or null when malformed. "24:00" is allowed as end of day. */
export function parseTimeInput(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;
  if (hours === 24 && minutes === 0) return 1440;
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

/** minutes → "HH:MM" for <input type="time"> (end of day maps to "23:59"). */
export function minutesToTimeInput(minutes: number): string {
  const m = Math.min(Math.max(minutes, 0), 1439);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function greetingFor(minutes: number): string {
  if (minutes >= 5 * 60 && minutes < 12 * 60) return "Good morning";
  if (minutes >= 12 * 60 && minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}
