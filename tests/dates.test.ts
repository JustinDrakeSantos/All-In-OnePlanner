import { afterEach, describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  formatDate,
  formatMinutes,
  greetingFor,
  isISODate,
  minutesNowInTimeZone,
  minutesToTimeInput,
  monthGrid,
  parseTimeInput,
  relativeDayLabel,
  startOfWeek,
  todayInTimeZone,
  weekDays,
  zonedTimeToInstant,
} from "@/lib/dates";

const ZONES = [
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/New_York",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const originalTZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTZ;
});

describe("ISO date validation", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2025-02-29")).toBe(false);
    expect(isISODate("2025-13-01")).toBe(false);
    expect(isISODate("2025-3-8")).toBe(false);
    expect(isISODate(20250308)).toBe(false);
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2025-03-01", -1)).toBe("2025-02-28");
  });

  it("clamps month addition to the end of the target month", () => {
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-03-31", -1)).toBe("2025-02-28");
    expect(addMonths("2025-11-15", 2)).toBe("2026-01-15");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2025-03-01", "2025-03-08")).toBe(7);
    expect(daysBetween("2025-03-08", "2025-03-01")).toBe(-7);
  });

  it("builds whole-week month grids of 28, 35, or 42 days", () => {
    const feb2026 = monthGrid("2026-02-10");
    expect(feb2026).toHaveLength(28);
    expect(feb2026[0]).toBe("2026-02-01");

    const nov2026 = monthGrid("2026-11-17");
    expect(nov2026).toHaveLength(35);
    expect(nov2026[0]).toBe("2026-11-01");

    const mar2025 = monthGrid("2025-03-08");
    expect(mar2025).toHaveLength(42);
    expect(mar2025[0]).toBe("2025-02-23");
    expect(mar2025.at(-1)).toBe("2025-04-05");
  });

  it("lists the Sunday-to-Saturday week around a date", () => {
    expect(startOfWeek("2025-03-08")).toBe("2025-03-02");
    expect(weekDays("2025-03-05")).toEqual([
      "2025-03-02",
      "2025-03-03",
      "2025-03-04",
      "2025-03-05",
      "2025-03-06",
      "2025-03-07",
      "2025-03-08",
    ]);
  });
});

describe("regression: the original app saved events on the wrong day east of UTC", () => {
  it.each(ZONES)("keeps a picked date on the same day when the server runs in %s", (zone) => {
    process.env.TZ = zone;
    // A date from <input type="date"> is stored as-is and only ever formatted in UTC.
    expect(formatDate("2025-03-08")).toBe("Mar 8, 2025");
    expect(addDays("2025-03-08", 0)).toBe("2025-03-08");
    expect(monthGrid("2025-03-08")).toContain("2025-03-08");
    expect(weekDays("2025-03-08").at(-1)).toBe("2025-03-08");
  });
});

describe("time zones", () => {
  it("computes today's date for the user's zone, not the server's", () => {
    const instant = new Date("2025-03-08T06:30:00Z");
    expect(todayInTimeZone("UTC", instant)).toBe("2025-03-08");
    expect(todayInTimeZone("Asia/Tokyo", instant)).toBe("2025-03-08");
    expect(todayInTimeZone("America/Los_Angeles", instant)).toBe("2025-03-07");
    expect(todayInTimeZone("Pacific/Honolulu", instant)).toBe("2025-03-07");
    expect(minutesNowInTimeZone("UTC", instant)).toBe(6 * 60 + 30);
  });

  it("converts a wall-clock time in a zone to the right instant", () => {
    expect(zonedTimeToInstant("2025-03-08", 9 * 60, "America/Los_Angeles").toISOString()).toBe(
      "2025-03-08T17:00:00.000Z",
    );
    expect(zonedTimeToInstant("2025-03-08", 9 * 60, "Asia/Tokyo").toISOString()).toBe(
      "2025-03-08T00:00:00.000Z",
    );
    // US daylight saving starts 2025-03-09: noon is PDT (UTC-7).
    expect(zonedTimeToInstant("2025-03-09", 12 * 60, "America/Los_Angeles").toISOString()).toBe(
      "2025-03-09T19:00:00.000Z",
    );
  });

  it.each(ZONES)("round-trips wall-clock times in %s", (zone) => {
    for (const minutes of [0, 30, 9 * 60, 13 * 60 + 30, 23 * 60 + 45]) {
      const instant = zonedTimeToInstant("2025-07-04", minutes, zone);
      expect(todayInTimeZone(zone, instant)).toBe("2025-07-04");
      expect(minutesNowInTimeZone(zone, instant)).toBe(minutes);
    }
  });
});

describe("formatting", () => {
  it("formats minutes as clock times (fixes the old '11:30 PM' label for 1:30 PM)", () => {
    expect(formatMinutes(0)).toBe("12:00 AM");
    expect(formatMinutes(720)).toBe("12:00 PM");
    expect(formatMinutes(810)).toBe("1:30 PM");
    expect(formatMinutes(1410)).toBe("11:30 PM");
    expect(formatMinutes(1440)).toBe("12:00 AM");
  });

  it("parses and produces time-input values", () => {
    expect(parseTimeInput("13:30")).toBe(810);
    expect(parseTimeInput("24:00")).toBe(1440);
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("9:00")).toBeNull();
    expect(minutesToTimeInput(810)).toBe("13:30");
    expect(minutesToTimeInput(1440)).toBe("23:59");
  });

  it("labels nearby days relatively", () => {
    expect(relativeDayLabel("2025-03-08", "2025-03-08")).toBe("Today");
    expect(relativeDayLabel("2025-03-09", "2025-03-08")).toBe("Tomorrow");
    expect(relativeDayLabel("2025-03-07", "2025-03-08")).toBe("Yesterday");
    expect(relativeDayLabel("2025-03-12", "2025-03-08")).toBe("Wed, Mar 12");
  });

  it("greets by time of day instead of a hard-coded hour", () => {
    expect(greetingFor(9 * 60)).toBe("Good morning");
    expect(greetingFor(14 * 60)).toBe("Good afternoon");
    expect(greetingFor(21 * 60)).toBe("Good evening");
    expect(greetingFor(2 * 60)).toBe("Good evening");
  });
});
