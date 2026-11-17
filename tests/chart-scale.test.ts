import { describe, expect, it } from "vitest";
import { niceDomain, niceTicks } from "@/lib/chart-scale";

describe("chart scales", () => {
  it("picks round tick steps", () => {
    expect(niceTicks(0, 10000)).toEqual([0, 2500, 5000, 7500, 10000]);
    expect(niceTicks(0, 63)).toEqual([0, 20, 40, 60]);
  });

  it("pads a domain around the data to round values, never clipping a point", () => {
    expect(niceDomain([158.2, 161.9, 160.4], [0, 1])).toEqual([156, 164]);
    for (const values of [[158.95, 159.2], [0.3, 0.9], [71.4, 72.6, 70.05], [9001, 12950]]) {
      const [lo, hi] = niceDomain(values, [0, 1]);
      expect(lo).toBeLessThanOrEqual(Math.min(...values));
      expect(hi).toBeGreaterThanOrEqual(Math.max(...values));
    }
    expect(niceDomain([], [0, 100])).toEqual([0, 100]);
    const [lo, hi] = niceDomain([70, 70], [0, 1]);
    expect(lo).toBeLessThan(70);
    expect(hi).toBeGreaterThan(70);
  });
});
