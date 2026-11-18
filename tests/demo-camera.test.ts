import { describe, expect, it } from "vitest";
import { CONTENT_LEFT, PAGE, cameraAt, cameraTransform, focusAt, type DemoTrack } from "@/lib/demo-camera";

const track: DemoTrack = {
  duration: 8,
  start: { x: 900, y: 700 },
  moves: [
    { t0: 0.7, t1: 1.4, from: { x: 900, y: 700 }, to: { x: 300, y: 200 } },
    { t0: 3, t1: 3.8, from: { x: 300, y: 200 }, to: { x: 1200, y: 760 } },
  ],
  clicks: [
    { t: 1.45, at: { x: 300, y: 200 } },
    { t: 3.85, at: { x: 1200, y: 760 } },
  ],
};

describe("demo camera", () => {
  it("shows the whole page at the start and the end, so a loop dissolves cleanly", () => {
    expect(cameraAt(track, 0)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(cameraAt(track, track.duration).scale).toBe(1);
  });

  it("pulls back soon after the last click, to show the result in context", () => {
    expect(cameraAt(track, 4.2).scale).toBeGreaterThan(1.5); // just after the last click
    expect(cameraAt(track, 5.4).scale).toBe(1); // well before the end of the clip
  });

  it("zooms in while the action happens", () => {
    expect(cameraAt(track, 2).scale).toBeCloseTo(1.7);
    expect(cameraAt(track, 2, 2).scale).toBeCloseTo(2);
  });

  it("looks at the first target from the start, then glides to the next one", () => {
    expect(focusAt(track, 0)).toEqual({ x: 300, y: 200 });
    expect(focusAt(track, 2.5)).toEqual({ x: 300, y: 200 });
    const midway = focusAt(track, 3.3);
    expect(midway.x).toBeGreaterThan(300);
    expect(midway.x).toBeLessThan(1200);
    expect(focusAt(track, 6)).toEqual({ x: 1200, y: 760 });
  });

  it("never shows anything outside the page, even for targets near an edge", () => {
    for (let t = 0; t <= track.duration; t += 0.1) {
      const view = cameraAt(track, t);
      expect(view.x).toBeGreaterThanOrEqual(0);
      expect(view.y).toBeGreaterThanOrEqual(0);
      expect(view.x + PAGE.width / view.scale).toBeLessThanOrEqual(PAGE.width + 1e-6);
      expect(view.y + PAGE.height / view.scale).toBeLessThanOrEqual(PAGE.height + 1e-6);
    }
  });

  it("keeps zoomed-in views clear of the app's sidebar, even when the action is near it", () => {
    const view = cameraAt(track, 2); // focused on (300, 200), right next to the sidebar
    expect(view.scale).toBeCloseTo(1.7);
    expect(view.x).toBeGreaterThanOrEqual(CONTENT_LEFT - 1e-6);
    expect(cameraAt(track, 0).x).toBe(0); // fully zoomed out, the whole app shows
  });

  it("turns a view into a transform for a page-sized box", () => {
    expect(cameraTransform({ scale: 2, x: 640, y: 0 })).toBe("scale(2.0000) translate(-50.000%, 0.000%)");
  });

  it("stays put when a clip has no cursor moves", () => {
    expect(focusAt({ ...track, moves: [] }, 3)).toEqual(track.start);
  });
});
