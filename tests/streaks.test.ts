import { describe, expect, it } from "vitest";
import { currentStreak, longestStreak, nextOccurrence } from "@/lib/streaks";

describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2025-03-06", "2025-03-07", "2025-03-08"], "2025-03-08")).toBe(3);
  });

  it("keeps yesterday's streak alive until today ends", () => {
    expect(currentStreak(["2025-03-06", "2025-03-07"], "2025-03-08")).toBe(2);
  });

  it("resets after a missed day", () => {
    expect(currentStreak(["2025-03-05", "2025-03-06"], "2025-03-08")).toBe(0);
    expect(currentStreak([], "2025-03-08")).toBe(0);
  });

  it("finds the longest run, ignoring duplicates and order", () => {
    expect(
      longestStreak(["2025-03-10", "2025-03-01", "2025-03-02", "2025-03-02", "2025-03-03", "2025-03-11"]),
    ).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("recurring tasks", () => {
  it("advances from the due date", () => {
    expect(nextOccurrence("daily", "2025-03-08", "2025-03-08")).toBe("2025-03-09");
    expect(nextOccurrence("weekly", "2025-03-08", "2025-03-08")).toBe("2025-03-15");
    expect(nextOccurrence("monthly", "2025-01-31", "2025-01-31")).toBe("2025-02-28");
  });

  it("skips ahead past dates that are already over", () => {
    expect(nextOccurrence("daily", "2025-03-01", "2025-03-08")).toBe("2025-03-09");
    expect(nextOccurrence("weekly", "2025-03-01", "2025-03-08")).toBe("2025-03-15");
  });

  it("uses the completion day when the task had no due date", () => {
    expect(nextOccurrence("weekly", null, "2025-03-08")).toBe("2025-03-15");
  });
});
