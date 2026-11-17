import { describe, expect, it } from "vitest";
import { layoutTimedEvents, type TimedItem } from "@/lib/calendar-layout";

const ev = (id: string, start: number, end: number): TimedItem => ({
  id,
  startMinute: start,
  endMinute: end,
});

const byId = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((i) => [i.id, i]));

describe("layoutTimedEvents", () => {
  it("gives a lone event the full width", () => {
    const [only] = layoutTimedEvents([ev("a", 540, 600)]);
    expect(only.box).toMatchObject({ left: 0, width: 100 });
    expect(only.box.top).toBeCloseTo((540 / 1440) * 100);
    expect(only.box.height).toBeCloseTo((60 / 1440) * 100);
  });

  it("puts two overlapping events side by side", () => {
    const out = byId(layoutTimedEvents([ev("a", 540, 660), ev("b", 600, 720)]));
    expect(out.a.box).toMatchObject({ left: 0, width: 50 });
    expect(out.b.box).toMatchObject({ left: 50, width: 50 });
  });

  it("keeps back-to-back events full width", () => {
    const out = byId(layoutTimedEvents([ev("a", 540, 600), ev("b", 600, 660)]));
    expect(out.a.box.width).toBe(100);
    expect(out.b.box.width).toBe(100);
  });

  it("reuses a freed column inside a cluster", () => {
    // a spans the morning; b and c follow each other beside it.
    const out = byId(layoutTimedEvents([ev("a", 480, 720), ev("b", 480, 540), ev("c", 600, 660)]));
    expect(out.a.box).toMatchObject({ left: 0, width: 50 });
    expect(out.b.box).toMatchObject({ left: 50, width: 50 });
    expect(out.c.box).toMatchObject({ left: 50, width: 50 });
  });

  it("lets an event stretch into empty neighbouring columns", () => {
    const out = byId(
      layoutTimedEvents([ev("a", 480, 600), ev("b", 480, 540), ev("c", 480, 510), ev("d", 540, 600)]),
    );
    // Three columns; d starts after b and c end, so it can take columns 1 and 2.
    expect(out.a.box.width).toBeCloseTo(100 / 3);
    expect(out.d.box.left).toBeCloseTo(100 / 3);
    expect(out.d.box.width).toBeCloseTo(200 / 3);
  });

  it("never lets overlapping events overlap on screen", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let round = 0; round < 50; round += 1) {
      const items = Array.from({ length: 8 }, (_, i) => {
        const start = Math.floor(random() * 1300);
        return ev(`e${i}`, start, Math.min(1440, start + 15 + Math.floor(random() * 180)));
      });
      const placed = layoutTimedEvents(items);
      expect(placed).toHaveLength(items.length);
      for (const a of placed) {
        for (const b of placed) {
          if (a === b) continue;
          const verticalOverlap =
            a.box.top < b.box.top + b.box.height - 1e-9 && b.box.top < a.box.top + a.box.height - 1e-9;
          const horizontalOverlap =
            a.box.left < b.box.left + b.box.width - 1e-9 && b.box.left < a.box.left + a.box.width - 1e-9;
          expect(verticalOverlap && horizontalOverlap).toBe(false);
        }
      }
    }
  });
});
