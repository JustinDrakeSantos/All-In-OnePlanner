/** Axis helpers shared by the server (to pick a domain) and the client charts. */

/** Round tick values (steps of 1, 2, 2.5, or 5 × a power of ten) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step / 1e6; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function niceDomain(values: number[], fallback: [number, number]): [number, number] {
  const present = values.filter((v) => Number.isFinite(v));
  if (present.length === 0) return fallback;
  let min = Math.min(...present);
  let max = Math.max(...present);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const lo = min - (max - min) * 0.1;
  const hi = max + (max - min) * 0.1;
  const ticks = niceTicks(lo, hi);
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  // Round outward to whole steps so every value stays inside the plot.
  const round = (v: number) => Number(v.toFixed(6));
  return [round(Math.floor(lo / step) * step), round(Math.ceil(hi / step) * step)];
}
