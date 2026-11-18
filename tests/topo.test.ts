import { describe, expect, it } from "vitest";
import {
  LINE_POINTS,
  blend,
  closedPath,
  contains,
  easeInOut,
  elevation,
  ellipse,
  isolines,
  linePath,
  matchRing,
  roundedRect,
  simplify,
  span,
  type Terrain,
} from "@/lib/topo";

const hill: Terrain = { width: 400, height: 300, peaks: [{ x: 200, y: 150, height: 1, rx: 90, ry: 60 }] };
const levels = [0.2, 0.4, 0.6, 0.8];

describe("terrain", () => {
  it("is highest at a peak and falls away from it", () => {
    expect(elevation(hill, 200, 150)).toBeCloseTo(1);
    expect(elevation(hill, 260, 150)).toBeLessThan(elevation(hill, 230, 150));
  });

  it("traces one closed ring per level around a lone hill", () => {
    const lines = isolines(hill, levels, 6);
    expect(lines).toHaveLength(levels.length);
    lines.forEach((line) => {
      expect(line.closed).toBe(true);
      expect(contains(line.points, { x: 200, y: 150 })).toBe(true);
    });
  });

  it("nests the rings, lower levels outside higher ones, without crossing", () => {
    const lines = isolines(hill, levels, 6);
    for (let i = 1; i < lines.length; i += 1) {
      const outer = lines.find((l) => l.level === i - 1)!;
      const inner = lines.find((l) => l.level === i)!;
      expect(span(outer.points)).toBeGreaterThan(span(inner.points));
      inner.points.forEach((p) => expect(contains(outer.points, p)).toBe(true));
    }
  });

  it("leaves lines open where they run off the map", () => {
    const edge: Terrain = { ...hill, peaks: [{ x: 0, y: 150, height: 1, rx: 120, ry: 80 }] };
    const lines = isolines(edge, levels, 6);
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((line) => expect(line.closed).toBe(false));
  });

  it("wanders with warp but keeps every ring closed", () => {
    const lines = isolines({ ...hill, warp: 10 }, levels, 6);
    expect(lines.filter((l) => l.closed)).toHaveLength(levels.length);
  });
});

describe("drawing lines", () => {
  it("drops points that don't bend the line", () => {
    const straight = Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: 10 }));
    expect(simplify(straight, 0.5)).toEqual([straight[0], straight[19]]);
    const corner = [...straight, { x: 95, y: 60 }];
    expect(simplify(corner, 0.5)).toHaveLength(3);
  });

  it("writes straight paths, closing the loops", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(linePath(pts, false)).toBe("M0 0L10 0L10 10");
    expect(linePath(pts, true)).toBe("M0 0L10 0L10 10Z");
  });

  it("writes smooth closed paths", () => {
    const d = closedPath(roundedRect(0, 0, 100, 50, 8));
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(LINE_POINTS);
  });
});

describe("morph targets", () => {
  it("fits a rounded rectangle to its box, starting mid-right", () => {
    const rect = roundedRect(300, 200, 700, 400, 12);
    expect(rect).toHaveLength(LINE_POINTS);
    expect(rect[0]).toEqual({ x: 700, y: 300 });
    const xs = rect.map((p) => p.x);
    const ys = rect.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(300);
    expect(Math.max(...xs)).toBeCloseTo(700);
    expect(Math.min(...ys)).toBeCloseTo(200);
    expect(Math.max(...ys)).toBeCloseTo(400);
  });

  it("puts corner points on the corner's curve", () => {
    const rect = roundedRect(0, 0, 400, 200, 20);
    const corner = rect.filter((p) => p.x > 380 && p.y > 180);
    expect(corner.length).toBeGreaterThan(1);
    corner.forEach((p) => expect(Math.hypot(p.x - 380, p.y - 180)).toBeCloseTo(20));
  });

  it("re-traces a contour point for point with its target", () => {
    const ring = isolines(hill, [0.5], 6)[0].points;
    const target = roundedRect(120, 100, 280, 200, 10);
    const traced = matchRing(ring, target);
    expect(traced).toHaveLength(target.length);
    // Starts on the ring's right side, level with its middle...
    expect(traced[0].x).toBeGreaterThan(200);
    expect(traced[0].y).toBeCloseTo(150, 0);
    // ...and every point sits on the ring.
    traced.forEach((p) => expect(Math.abs(elevation(hill, p.x, p.y) - 0.5)).toBeLessThan(0.02));
  });

  it("runs clockwise whichever way the contour was traced", () => {
    const loop = ellipse(0, 0, 100, 50);
    const target = roundedRect(-100, -50, 100, 50, 10);
    const a = matchRing(loop, target);
    const b = matchRing([...loop].reverse(), target);
    a.forEach((p, i) => {
      expect(p.x).toBeCloseTo(b[i].x, 0);
      expect(p.y).toBeCloseTo(b[i].y, 0);
    });
    // A quarter of the way round, clockwise on screen, is the bottom.
    expect(a[Math.round(LINE_POINTS / 4)].y).toBeGreaterThan(40);
  });

  it("blends from one line to the other", () => {
    const a = ellipse(0, 0, 50, 30);
    const b = roundedRect(-100, -50, 100, 50, 10);
    expect(blend(a, b, 0)).toEqual(a);
    blend(a, b, 1).forEach((p, i) => {
      expect(p.x).toBeCloseTo(b[i].x);
      expect(p.y).toBeCloseTo(b[i].y);
    });
  });

  it("eases from 0 to 1", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
});
