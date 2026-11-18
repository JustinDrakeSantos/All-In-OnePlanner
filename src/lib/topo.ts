/**
 * A topographic map for the landing page's hero, and the shapes some of its
 * contour lines morph into.
 *
 * The map is real terrain: a few peaks, gently warped, traced into contour
 * lines with marching squares, so lines nest and never cross. A contour can
 * then be re-traced with the same number of points as a target shape (a
 * rounded rectangle), point for point, and blended into it.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Peak {
  x: number;
  y: number;
  height: number;
  /** Horizontal and vertical spread, in px. */
  rx: number;
  ry: number;
}

export interface Terrain {
  width: number;
  height: number;
  peaks: Peak[];
  /** How far (px) the ground is pushed around so lines wander like real terrain. 0 = perfect ellipses. */
  warp?: number;
}

export interface ContourLine {
  /** Index into the levels the map was traced at. */
  level: number;
  points: Pt[];
  /** Closed lines loop back to their first point (not repeated); open lines run off the edge of the map. */
  closed: boolean;
}

/** Points in a line that can morph (a re-traced contour, and the shape it becomes). */
export const LINE_POINTS = 96;

/** Height of the terrain at (x, y). */
export function elevation(terrain: Terrain, x: number, y: number): number {
  const w = terrain.warp ?? 0;
  const wx = x + w * (Math.sin(y / 173 + 0.6) + 0.6 * Math.sin((x + y) / 97 + 2.1));
  const wy = y + w * (Math.cos(x / 151 + 1.3) + 0.6 * Math.sin((x - y) / 113 + 0.4));
  let h = 0;
  for (const p of terrain.peaks) {
    const dx = (wx - p.x) / p.rx;
    const dy = (wy - p.y) / p.ry;
    h += p.height * Math.exp(-(dx * dx + dy * dy));
  }
  return h;
}

/**
 * Contour lines of the terrain at each level, traced with marching squares on
 * a grid of `step` px.
 */
export function isolines(terrain: Terrain, levels: number[], step: number): ContourLine[] {
  const cols = Math.ceil(terrain.width / step) + 1;
  const rows = Math.ceil(terrain.height / step) + 1;
  const v = new Float64Array(cols * rows);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) v[j * cols + i] = elevation(terrain, i * step, j * step);
  }

  // Grid edges get ids: the edge right of grid point n is 2n, the edge below it is 2n + 1.
  const crossing = (edge: number, level: number): Pt => {
    const n = edge >> 1;
    const i = n % cols;
    const j = (n - i) / cols;
    const a = v[n];
    const b = edge & 1 ? v[n + cols] : v[n + 1];
    const t = (level - a) / (b - a);
    return edge & 1 ? { x: i * step, y: (j + t) * step } : { x: (i + t) * step, y: j * step };
  };

  const lines: ContourLine[] = [];
  levels.forEach((level, index) => {
    const links = new Map<number, number[]>();
    const join = (a: number, b: number) => {
      const la = links.get(a);
      if (la) la.push(b);
      else links.set(a, [b]);
      const lb = links.get(b);
      if (lb) lb.push(a);
      else links.set(b, [a]);
    };
    for (let j = 0; j < rows - 1; j += 1) {
      for (let i = 0; i < cols - 1; i += 1) {
        const n = j * cols + i;
        const tl = v[n];
        const tr = v[n + 1];
        const br = v[n + cols + 1];
        const bl = v[n + cols];
        const cell = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
        if (cell === 0 || cell === 15) continue;
        const top = 2 * n;
        const bottom = 2 * (n + cols);
        const left = 2 * n + 1;
        const right = 2 * (n + 1) + 1;
        switch (cell) {
          case 1:
          case 14:
            join(left, bottom);
            break;
          case 2:
          case 13:
            join(bottom, right);
            break;
          case 3:
          case 12:
            join(left, right);
            break;
          case 4:
          case 11:
            join(top, right);
            break;
          case 6:
          case 9:
            join(top, bottom);
            break;
          case 7:
          case 8:
            join(left, top);
            break;
          default: {
            // Saddles (5, 10): the cell's average decides which corners connect.
            const high = (tl + tr + br + bl) / 4 > level;
            if (cell === 5 ? high : !high) {
              join(top, left);
              join(bottom, right);
            } else {
              join(top, right);
              join(left, bottom);
            }
          }
        }
      }
    }

    const used = new Set<number>();
    const walk = (start: number): number[] => {
      const chain = [start];
      used.add(start);
      let prev = -1;
      let current = start;
      for (;;) {
        const next = links.get(current)?.find((e) => e !== prev && !used.has(e));
        if (next === undefined) return chain;
        chain.push(next);
        used.add(next);
        prev = current;
        current = next;
      }
    };
    const add = (chain: number[], closed: boolean) => {
      if (chain.length > 2) lines.push({ level: index, points: chain.map((e) => crossing(e, level)), closed });
    };
    // Lines that run off the map start at an edge with one neighbour; whatever is left are loops.
    for (const [edge, next] of links) if (next.length === 1 && !used.has(edge)) add(walk(edge), false);
    for (const edge of links.keys()) if (!used.has(edge)) add(walk(edge), true);
  });
  return lines;
}

/** Drop points that bend the line less than `epsilon` px (Ramer-Douglas-Peucker). */
export function simplify(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const A = points[a];
    const B = points[b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const length = Math.hypot(dx, dy);
    let far = -1;
    let max = epsilon;
    for (let i = a + 1; i < b; i += 1) {
      const p = points[i];
      const d = length ? Math.abs(dy * (p.x - A.x) - dx * (p.y - A.y)) / length : Math.hypot(p.x - A.x, p.y - A.y);
      if (d > max) {
        max = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (v: number) => Math.round(v * 10) / 10;

/** A line as straight SVG segments (closed lines get a Z). */
export function linePath(points: Pt[], closed: boolean): string {
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i += 1) d += `L${round(points[i].x)} ${round(points[i].y)}`;
  return closed ? `${d}Z` : d;
}

/** A smooth closed SVG path through the points (Catmull-Rom curves drawn as cubic Béziers). */
export function closedPath(points: Pt[]): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n];
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += `C${round(p1.x + (p2.x - p0.x) / 6)} ${round(p1.y + (p2.y - p0.y) / 6)} ${round(p2.x - (p3.x - p1.x) / 6)} ${round(p2.y - (p3.y - p1.y) / 6)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return `${d}Z`;
}

/** Whether p is inside the closed line. */
export function contains(points: Pt[], p: Pt): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Width of a line's bounding box. */
export function span(points: Pt[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p.x < min) min = p.x;
    if (p.x > max) max = p.x;
  }
  return max - min;
}

/**
 * A rounded rectangle as `n` points, starting at the middle of its right side
 * and running clockwise on screen. Each corner gets a few points of its own so
 * the corners stay round however few points the long sides get.
 */
export function roundedRect(x0: number, y0: number, x1: number, y1: number, radius: number, n = LINE_POINTS): Pt[] {
  const r = Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2));
  const cy = (y0 + y1) / 2;
  const perCorner = r >= 0.5 ? 4 : 1;
  type Piece = { from: Pt; to: Pt } | { cx: number; cy: number; start: number };
  const pieces: Piece[] = [
    { from: { x: x1, y: cy }, to: { x: x1, y: y1 - r } },
    { cx: x1 - r, cy: y1 - r, start: 0 },
    { from: { x: x1 - r, y: y1 }, to: { x: x0 + r, y: y1 } },
    { cx: x0 + r, cy: y1 - r, start: Math.PI / 2 },
    { from: { x: x0, y: y1 - r }, to: { x: x0, y: y0 + r } },
    { cx: x0 + r, cy: y0 + r, start: Math.PI },
    { from: { x: x0 + r, y: y0 }, to: { x: x1 - r, y: y0 } },
    { cx: x1 - r, cy: y0 + r, start: (Math.PI * 3) / 2 },
    { from: { x: x1, y: y0 + r }, to: { x: x1, y: cy } },
  ];
  // Share the remaining points among the straight sides by length (largest remainder).
  const sides = pieces.filter((p): p is { from: Pt; to: Pt } => "from" in p);
  const lengths = sides.map((s) => Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const budget = n - perCorner * 4;
  const exact = lengths.map((l) => (l / total) * budget);
  const counts = exact.map(Math.floor);
  let spare = budget - counts.reduce((a, b) => a + b, 0);
  exact
    .map((e, i) => ({ i, rest: e - Math.floor(e) }))
    .sort((a, b) => b.rest - a.rest)
    .forEach(({ i }) => {
      if (spare > 0) {
        counts[i] += 1;
        spare -= 1;
      }
    });

  const out: Pt[] = [];
  let side = 0;
  for (const piece of pieces) {
    if ("from" in piece) {
      const m = counts[side];
      side += 1;
      for (let q = 0; q < m; q += 1) {
        const t = q / m;
        out.push({ x: piece.from.x + (piece.to.x - piece.from.x) * t, y: piece.from.y + (piece.to.y - piece.from.y) * t });
      }
    } else {
      for (let q = 0; q < perCorner; q += 1) {
        const a = piece.start + (Math.PI / 2) * (q / perCorner);
        out.push({ x: piece.cx + r * Math.cos(a), y: piece.cy + r * Math.sin(a) });
      }
    }
  }
  return out;
}

/** Positive when the closed line runs clockwise on screen (y down). */
function signedArea(points: Pt[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

/** Distances along a closed line to each of its points, and the full length. */
function distances(points: Pt[]): { at: number[]; total: number } {
  const at = [0];
  for (let i = 1; i <= points.length; i += 1) {
    const p = points[i - 1];
    const q = points[i % points.length];
    at.push(at[i - 1] + Math.hypot(q.x - p.x, q.y - p.y));
  }
  return { at: at.slice(0, -1), total: at[at.length - 1] };
}

/**
 * Re-trace a closed contour with as many points as `target`, spaced the way
 * the target's are along its length. Both start at the middle of their right
 * side and run clockwise, so blending the two moves every point a short way
 * to its counterpart instead of twisting the line.
 */
export function matchRing(ring: Pt[], target: Pt[]): Pt[] {
  const loop = signedArea(ring) < 0 ? [...ring].reverse() : ring;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of loop) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Where a ray from the middle, heading right, leaves the line: the start.
  let startAt = 0;
  let start: Pt = loop[0];
  let best = -Infinity;
  for (let i = 0; i < loop.length; i += 1) {
    const p = loop[i];
    const q = loop[(i + 1) % loop.length];
    if (p.y === q.y || (p.y - cy) * (q.y - cy) > 0) continue;
    const x = p.x + ((cy - p.y) / (q.y - p.y)) * (q.x - p.x);
    if (x > cx && x > best) {
      best = x;
      startAt = i + 1;
      start = { x, y: cy };
    }
  }
  const from = [start, ...loop.slice(startAt), ...loop.slice(0, startAt)];

  const source = distances(from);
  const wanted = distances(target);
  const out: Pt[] = [];
  let k = 0;
  for (const d of wanted.at) {
    const want = (d / wanted.total) * source.total;
    while (k < from.length - 1 && source.at[k + 1] <= want) k += 1;
    const p = from[k];
    const q = from[(k + 1) % from.length];
    const segment = (k + 1 < from.length ? source.at[k + 1] : source.total) - source.at[k];
    const t = segment ? (want - source.at[k]) / segment : 0;
    out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  }
  return out;
}

/** A soft closed loop around (cx, cy), used when the terrain has no contour to spare. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, n = LINE_POINTS): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
}

/** Point-by-point blend of two lines (0 = a, 1 = b). */
export function blend(a: Pt[], b: Pt[], k: number): Pt[] {
  return a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * k, y: p.y + (b[i].y - p.y) * k }));
}

/** Ease in and out (cubic). */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
