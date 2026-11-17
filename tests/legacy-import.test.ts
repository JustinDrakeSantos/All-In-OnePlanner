import { afterEach, describe, expect, it } from "vitest";
import { browserLocalDate, parseLegacyEvents } from "@/lib/legacy-import";

const originalTZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTZ;
});

/** What the original eventStore.js wrote: the timestamp of local midnight. */
function legacyTimestamp(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 0, 0, 0).getTime();
}

describe("parseLegacyEvents", () => {
  it("converts the original localStorage format, keeping the displayed day", () => {
    for (const zone of ["America/Los_Angeles", "UTC", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      const raw = JSON.stringify([
        { title: "Meeting", date: legacyTimestamp(2025, 2, 8), startTime: 540, endTime: 600, color: "#2563EB" },
        { title: "Holiday", date: legacyTimestamp(2025, 2, 9), startTime: 0, endTime: 1440, color: "#16a34a" },
      ]);
      const { events, skipped } = parseLegacyEvents(raw, browserLocalDate);
      expect(skipped).toBe(0);
      expect(events).toEqual([
        { title: "Meeting", date: "2025-03-08", allDay: false, startMinute: 540, endMinute: 600, color: "glacier" },
        { title: "Holiday", date: "2025-03-09", allDay: true, startMinute: 0, endMinute: 1440, color: "slate" },
      ]);
    }
  });

  it("maps the old rainbow colors onto the brand tones", () => {
    const raw = JSON.stringify(
      ["#2563EB", "#ea580c", "#7C3AED", "#5C7FA3", "#123456"].map((color, i) => ({ title: `E${i}`, date: "2025-03-08", startTime: 0, endTime: 60, color })),
    );
    expect(parseLegacyEvents(raw).events.map((e) => e.color)).toEqual(["glacier", "lemon", "navy", "slate", "glacier"]);
  });

  it("accepts a double-encoded string from copy(localStorage.getItem('events'))", () => {
    const inner = JSON.stringify([{ title: "A", date: "2025-03-08", startTime: 60, endTime: 120, color: "#7C3AED" }]);
    const { events } = parseLegacyEvents(JSON.stringify(inner), () => "1999-01-01");
    expect(events[0]).toMatchObject({ title: "A", date: "2025-03-08" });
  });

  it("skips malformed entries instead of failing", () => {
    const raw = JSON.stringify([
      { title: "", date: "2025-03-08", startTime: 0, endTime: 60 },
      { title: "Backwards", date: "2025-03-08", startTime: 120, endTime: 60 },
      { title: "No date", startTime: 0, endTime: 60 },
      "nonsense",
      { title: "Good", date: "2025-03-08T00:00:00.000Z", startTime: 30, endTime: 90, color: "red" },
    ]);
    const { events, skipped } = parseLegacyEvents(raw, () => "2025-01-01");
    expect(skipped).toBe(4);
    expect(events).toEqual([
      { title: "Good", date: "2025-03-08", allDay: false, startMinute: 30, endMinute: 90, color: "glacier" },
    ]);
  });

  it("rejects input that isn't a list", () => {
    expect(() => parseLegacyEvents('{"title":"x"}')).toThrow(/list of events/);
    expect(() => parseLegacyEvents("not json")).toThrow();
  });
});
