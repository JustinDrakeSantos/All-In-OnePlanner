/**
 * Positions timed events inside a day column so overlapping events sit side by
 * side instead of on top of each other.
 *
 * 1. Sort by start time (longer events first on ties).
 * 2. Group events that overlap, directly or through a chain, into clusters.
 * 3. Within a cluster, put each event in the first column that is free.
 * 4. Let each event stretch right across neighbouring columns it doesn't collide with.
 *
 * Positions are percentages of the column, so the same result works at any size.
 */

export interface TimedItem {
  id: string;
  startMinute: number;
  endMinute: number;
}

export interface EventBox {
  top: number;
  height: number;
  left: number;
  width: number;
}

export type PositionedItem<T extends TimedItem> = T & { box: EventBox };

const MINUTES_PER_DAY = 1440;

export function layoutTimedEvents<T extends TimedItem>(
  items: readonly T[],
  minVisibleMinutes = 20,
): PositionedItem<T>[] {
  const visualEnd = (item: T) =>
    Math.min(MINUTES_PER_DAY, Math.max(item.endMinute, item.startMinute + minVisibleMinutes));

  const sorted = [...items].sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      b.endMinute - b.startMinute - (a.endMinute - a.startMinute) ||
      a.id.localeCompare(b.id),
  );

  const result: PositionedItem<T>[] = [];
  let cluster: T[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columns: T[][] = [];
    const columnOf = new Map<T, number>();

    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c += 1) {
        const last = columns[c][columns[c].length - 1];
        if (visualEnd(last) <= item.startMinute) {
          columns[c].push(item);
          columnOf.set(item, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        columnOf.set(item, columns.length - 1);
      }
    }

    const total = columns.length;
    const collides = (a: T, b: T) =>
      a.startMinute < visualEnd(b) && b.startMinute < visualEnd(a);

    for (const item of cluster) {
      const column = columnOf.get(item)!;
      let span = 1;
      for (let c = column + 1; c < total; c += 1) {
        if (columns[c].some((other) => collides(item, other))) break;
        span += 1;
      }
      result.push({
        ...item,
        box: {
          top: (item.startMinute / MINUTES_PER_DAY) * 100,
          height: ((visualEnd(item) - item.startMinute) / MINUTES_PER_DAY) * 100,
          left: (column / total) * 100,
          width: (span / total) * 100,
        },
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMinute >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, visualEnd(item));
  }
  flush();

  return result;
}
