import { isISODate, type ISODate } from "./dates";
import { LEGACY_COLOR_TONES, type Tone } from "./constants";

/**
 * Converts events saved by the original static calendar (localStorage key
 * "events") into the new format.
 *
 * The old app saved each event's date as the timestamp of local midnight in
 * the browser that created it, so it must be converted in the browser too:
 * `localDateOf` turns a timestamp into the local calendar date the old app
 * displayed. Nothing visibly moves.
 */

export interface ImportedEvent {
  title: string;
  date: ISODate;
  allDay: boolean;
  startMinute: number;
  endMinute: number;
  color: Tone;
}

export interface LegacyConversion {
  events: ImportedEvent[];
  skipped: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function browserLocalDate(timestamp: number): ISODate {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}


export function parseLegacyEvents(
  raw: string,
  localDateOf: (timestamp: number) => ISODate = browserLocalDate,
): LegacyConversion {
  let parsed: unknown = JSON.parse(raw);
  // `copy(localStorage.getItem("events"))` can produce a JSON string of JSON.
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a list of events (a JSON array).");
  }

  const events: ImportedEvent[] = [];
  let skipped = 0;

  for (const item of parsed) {
    const event = convertOne(item, localDateOf);
    if (event) events.push(event);
    else skipped += 1;
  }
  return { events, skipped };
}

function convertOne(
  item: unknown,
  localDateOf: (timestamp: number) => ISODate,
): ImportedEvent | null {
  if (typeof item !== "object" || item === null) return null;
  const record = item as Record<string, unknown>;

  const title = typeof record.title === "string" ? record.title.trim().slice(0, 200) : "";
  if (!title) return null;

  let date: ISODate | null = null;
  if (typeof record.date === "number" && Number.isFinite(record.date)) {
    date = localDateOf(record.date);
  } else if (typeof record.date === "string") {
    // Accept "2025-03-08" or an ISO timestamp like "2025-03-08T00:00:00.000Z".
    const day = record.date.slice(0, 10);
    if (isISODate(day)) date = day;
  }
  if (!date || !isISODate(date)) return null;

  const start = Number(record.startTime);
  const end = Number(record.endTime);
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end > 1440 || start >= end) return null;

  // The old palette maps onto the four brand tones; anything else becomes glacier.
  const color: Tone =
    typeof record.color === "string" ? (LEGACY_COLOR_TONES[record.color.toUpperCase()] ?? "glacier") : "glacier";

  return {
    title,
    date,
    allDay: start === 0 && end === 1440,
    startMinute: start,
    endMinute: end,
    color,
  };
}
