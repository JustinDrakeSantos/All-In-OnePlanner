"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { niceTicks } from "@/lib/chart-scale";
import { cn } from "@/lib/cn";

/*
 * Small, dependency-free SVG charts following the dataviz rules used across the
 * app: one series color (--chart-1, validated against both surfaces), 2px lines,
 * ringed end markers, columns capped at 24px with rounded data ends, hairline
 * solid gridlines, text in text colors only, a hover/focus readout, and a data
 * table so no value depends on hovering.
 */

export interface Point {
  /** Short label for the x position (e.g. "Mar 8"). */
  label: string;
  value: number | null;
  /** The value formatted for people (e.g. "9,000 steps"); defaults to the number. */
  display?: string;
}

/** Optional custom tick labels, e.g. mood names on a 1–5 scale. */
export interface Tick {
  value: number;
  label: string;
}

const show = (p: Point) => (p.value === null ? "No entry" : (p.display ?? p.value.toLocaleString("en-US")));
const defaultTick = (t: number) => (t >= 10000 ? `${Math.round(t / 1000)}K` : t.toLocaleString("en-US"));

const PAD = { top: 12, right: 48, bottom: 26, left: 44 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 70, 0), Math.max(0, width - 140));
  return (
    <div
      className="pointer-events-none absolute z-10 w-[140px] rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-pop"
      style={{ left, top: Math.max(0, y - 52) }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line chart
// ---------------------------------------------------------------------------

export function LineChart({
  points,
  domain,
  ticks,
  title,
  height = 200,
  area = true,
  connectGaps = false,
}: {
  points: Point[];
  domain: [number, number];
  ticks?: Tick[];
  title: string;
  height?: number;
  area?: boolean;
  /** Draw through missing days (for occasional measurements like weight). */
  connectGaps?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const [min, max] = domain;
  const x = (i: number) => PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH;
  const yTicks: Tick[] = ticks ?? niceTicks(min, max).map((t) => ({ value: t, label: defaultTick(t) }));

  // Break the line where values are missing, unless asked to connect across gaps.
  const segments: { i: number; v: number }[][] = [];
  let current: { i: number; v: number }[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (!connectGaps && current.length) {
        segments.push(current);
        current = [];
      }
    } else current.push({ i, v: p.value });
  });
  if (current.length) segments.push(current);

  const lastIndex = points.findLastIndex((p) => p.value !== null);
  const present = points.filter((p) => p.value !== null).length;

  const nearest = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - PAD.left;
    const idx = Math.round((rel / (plotW || 1)) * (points.length - 1));
    return Math.min(points.length - 1, Math.max(0, idx));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((prev) => {
      const start = prev ?? lastIndex;
      const next = start + (e.key === "ArrowRight" ? 1 : -1);
      return Math.min(points.length - 1, Math.max(0, next));
    });
  };

  const xLabelIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);

  return (
    <figure className="m-0">
      <div
        ref={ref}
        className="relative w-full outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
        style={{ height }}
        tabIndex={present > 0 ? 0 : -1}
        role="img"
        aria-label={`${title}. ${present} values. Use the arrow keys to read each day, or open the data table below.`}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? lastIndex)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 ? (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            {yTicks.map((t) => (
              <g key={t.value}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t.value)} y2={y(t.value)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t.value)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {t.label}
                </text>
              </g>
            ))}
            {xLabelIdx.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={height - 6}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                className="fill-muted text-[11px]"
              >
                {points[i]?.label}
              </text>
            ))}
            {segments.map((seg, s) => (
              <g key={s}>
                {area && seg.length > 1 ? (
                  <path
                    d={`M${x(seg[0].i)},${y(min)} ${seg.map((p) => `L${x(p.i)},${y(p.v)}`).join(" ")} L${x(seg[seg.length - 1].i)},${y(min)} Z`}
                    fill="var(--chart-1)"
                    opacity={0.1}
                  />
                ) : null}
                <path
                  d={seg.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)},${y(p.v)}`).join(" ")}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {seg.length === 1 ? <circle cx={x(seg[0].i)} cy={y(seg[0].v)} r={3} fill="var(--chart-1)" /> : null}
              </g>
            ))}
            {active !== null ? (
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--muted)" strokeWidth={1} />
            ) : null}
            {lastIndex >= 0 ? (
              <>
                <circle cx={x(lastIndex)} cy={y(points[lastIndex].value!)} r={5} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={2} />
                <text x={x(lastIndex) + 9} y={y(points[lastIndex].value!)} dy="0.32em" className="fill-fg text-[12px] font-semibold">
                  {show(points[lastIndex])}
                </text>
              </>
            ) : null}
            {active !== null && points[active]?.value !== null ? (
              <circle cx={x(active)} cy={y(points[active].value!)} r={5} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={2} />
            ) : null}
          </svg>
        ) : null}
        {active !== null && width > 0 ? (
          <Tooltip x={x(active)} y={points[active].value !== null ? y(points[active].value!) : PAD.top + plotH / 2} width={width}>
            <p className="text-sm font-semibold text-fg">{show(points[active])}</p>
            <p className="text-muted">{points[active].label}</p>
          </Tooltip>
        ) : null}
      </div>
      <DataTable title={title} rows={points.map((p) => [p.label, p.value === null ? "—" : show(p)])} />
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Column chart
// ---------------------------------------------------------------------------

export function ColumnChart({
  points,
  title,
  goal,
  goalLabel,
  height = 200,
  highlightLast = true,
}: {
  points: Point[];
  title: string;
  goal?: number;
  goalLabel?: string;
  height?: number;
  highlightLast?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const values = points.map((p) => p.value ?? 0);
  const max = Math.max(...values, goal ?? 0, 1);
  // Round the top of the axis up to a whole step so the tallest column fits.
  const rough = niceTicks(0, max * 1.05, 4);
  const step = rough.length > 1 ? rough[1] - rough[0] : max;
  const top = Math.ceil((max * 1.05) / step) * step;
  const ticks = niceTicks(0, top, Math.round(top / step));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const slot = points.length ? plotW / points.length : 0;
  const barW = Math.max(2, Math.min(24, slot * 0.6));
  const cx = (i: number) => PAD.left + slot * i + slot / 2;
  const showEveryLabel = slot >= 28;
  const lastIndex = points.length - 1;

  const columnPath = (i: number, v: number) => {
    const h = Math.max(0, PAD.top + plotH - y(v));
    if (h === 0) return "";
    const r = Math.min(4, h, barW / 2);
    const x0 = cx(i) - barW / 2;
    const base = PAD.top + plotH;
    return `M${x0},${base} L${x0},${base - h + r} Q${x0},${base - h} ${x0 + r},${base - h} L${x0 + barW - r},${base - h} Q${x0 + barW},${base - h} ${x0 + barW},${base - h + r} L${x0 + barW},${base} Z`;
  };


  return (
    <figure className="m-0">
      <div ref={ref} className="relative w-full" style={{ height }} role="group" aria-label={title} onPointerLeave={() => setActive(null)}>
        {width > 0 ? (
          <svg width={width} height={height} className="block overflow-visible">
            <g aria-hidden>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                  <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                    {defaultTick(t)}
                  </text>
                </g>
              ))}
              {goal !== undefined ? (
                <g>
                  <line x1={PAD.left} x2={PAD.left + plotW} y1={y(goal)} y2={y(goal)} stroke="var(--fg)" strokeOpacity={0.55} strokeWidth={1} />
                  <text x={PAD.left + plotW + 4} y={y(goal)} dy="0.32em" className="fill-muted text-[11px]">
                    {goalLabel ?? "Goal"}
                  </text>
                </g>
              ) : null}
            </g>
            {points.map((p, i) => (
              <g
                key={i}
                tabIndex={0}
                role="img"
                aria-label={`${p.label}: ${p.value === null ? "no entry" : show(p)}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <rect x={cx(i) - slot / 2} y={PAD.top} width={slot} height={plotH} fill="transparent" />
                <path d={columnPath(i, p.value ?? 0)} fill="var(--chart-1)" opacity={active === null || active === i ? 1 : 0.55} />
                {active === i ? (
                  <rect x={cx(i) - slot / 2 + 1} y={PAD.top} width={slot - 2} height={plotH} fill="none" stroke="var(--primary)" strokeWidth={1.5} rx={4} />
                ) : null}
                {showEveryLabel || i === 0 || i === lastIndex ? (
                  <text x={cx(i)} y={height - 6} textAnchor="middle" className="fill-muted text-[11px]" aria-hidden>
                    {p.label}
                  </text>
                ) : null}
              </g>
            ))}
            {highlightLast &&
            lastIndex >= 0 &&
            points[lastIndex].value &&
            // Skip the label when it would sit on the goal label or spill over a taller neighbor.
            (goal === undefined || Math.abs(y(points[lastIndex].value!) - 6 - y(goal)) > 14) &&
            !(
              lastIndex > 0 &&
              (points[lastIndex - 1].value ?? 0) > points[lastIndex].value! &&
              (show(points[lastIndex]).length * 6.2) / 2 > slot - barW / 2
            ) ? (
              <text x={cx(lastIndex)} y={y(points[lastIndex].value!) - 6} textAnchor="middle" className="fill-fg text-[11px] font-semibold" aria-hidden>
                {show(points[lastIndex])}
              </text>
            ) : null}
          </svg>
        ) : null}
        {active !== null && width > 0 ? (
          <Tooltip x={cx(active)} y={y(points[active].value ?? 0)} width={width}>
            <p className="text-sm font-semibold text-fg">{show(points[active])}</p>
            <p className="text-muted">{points[active].label}</p>
          </Tooltip>
        ) : null}
      </div>
      <DataTable title={title} rows={points.map((p) => [p.label, p.value === null ? "—" : show(p)])} />
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bars (few labelled categories) and the data table
// ---------------------------------------------------------------------------

export function BarList({ items, title }: { items: { label: string; value: number; display: string }[]; title: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2" aria-label={title}>
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm">
          <span className="truncate text-fg capitalize">{item.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r-[4px] bg-chart-1" style={{ width: `${(item.value / max) * 80}%`, minWidth: 4 }} aria-hidden />
            <span className="text-xs text-muted tabular-nums">{item.display}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ title, rows, className }: { title: string; rows: (string | number)[][]; className?: string }) {
  return (
    <details className={cn("mt-2 text-sm", className)}>
      <summary className="cursor-pointer text-xs font-medium text-muted hover:text-fg">Show data table</summary>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg bg-surface-2">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{title}</caption>
          <thead className="sticky top-0 bg-surface-3">
            <tr>
              <th scope="col" className="px-3 py-1.5 font-semibold">Day</th>
              <th scope="col" className="px-3 py-1.5 text-right font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-1">{label}</td>
                <td className="px-3 py-1 text-right tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
