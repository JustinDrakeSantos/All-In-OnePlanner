"use client";

import Link from "next/link";
import { TextLink } from "@/components/ui/text-link";
import { CheckSquare, MapPin, Plus, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { layoutTimedEvents } from "@/lib/calendar-layout";
import {
  dayOfWeek,
  formatDate,
  formatMinutes,
  formatTimeRange,
  isSameMonth,
  minutesNowInTimeZone,
  todayInTimeZone,
} from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import type { CalendarTask, CalendarViewName, EventData } from "./calendar-data";
import { EventDialog, type EventDraft } from "./event-dialog";

const HOUR_HEIGHT = 48; // px per hour in week/day view
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  view: CalendarViewName;
  days: string[];
  anchor: string;
  today: string;
  timeZone: string;
  initialNowMinute: number;
  events: EventData[];
  tasks: CalendarTask[];
  /** Server-rendered date navigation (Today, previous/next, title). */
  navigation: React.ReactNode;
  /** Server-rendered Month / Week / Day links. */
  viewSwitcher: React.ReactNode;
}

export function CalendarView({ view, days, anchor, today, timeZone, initialNowMinute, events, tasks, navigation, viewSwitcher }: Props) {
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const closeDialog = useCallback(() => setDraft(null), []);

  const byDay = useMemo(() => {
    const map = new Map<string, { events: EventData[]; tasks: CalendarTask[] }>();
    for (const day of days) map.set(day, { events: [], tasks: [] });
    for (const event of events) map.get(event.date)?.events.push(event);
    for (const task of tasks) map.get(task.dueDate)?.tasks.push(task);
    return map;
  }, [days, events, tasks]);

  const create = (date: string, startMinute = defaultStart(date, today, initialNowMinute), allDay = false) =>
    setDraft({ mode: "create", date, startMinute, endMinute: Math.min(startMinute + 60, 1440), allDay });
  const edit = (event: EventData) => setDraft({ mode: "edit", event });
  const createFromToolbar = () =>
    create(view === "month" ? (days.includes(today) ? today : anchor) : days.includes(today) ? today : days[0]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {navigation}
        <div className="flex items-center gap-2">
          {viewSwitcher}
          <Button onClick={createFromToolbar}>
            <Plus className="size-4" aria-hidden /> New event
          </Button>
        </div>
      </div>
      {view === "month" ? (
        <MonthGrid days={days} anchor={anchor} today={today} byDay={byDay} onCreate={create} onEdit={edit} />
      ) : (
        <TimeGrid
          days={days}
          today={today}
          timeZone={timeZone}
          initialNowMinute={initialNowMinute}
          byDay={byDay}
          onCreate={create}
          onEdit={edit}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {events.length} events and {tasks.length} tasks in this view.
      </div>
      <EventDialog draft={draft} onClose={closeDialog} />
    </>
  );
}

function defaultStart(date: string, today: string, nowMinute: number) {
  if (date !== today) return 9 * 60;
  return Math.min(23 * 60, Math.ceil((nowMinute + 1) / 60) * 60);
}

/** Today's date number gets the gold accent. */
function DayNumber({ day, isToday, outside = false, size = "md" }: { day: string; isToday: boolean; outside?: boolean; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full tabular-nums",
        size === "lg" ? "size-8 text-lg font-semibold" : "size-7 text-sm",
        isToday ? "bg-accent font-semibold text-accent-fg" : outside ? "text-subtle" : "text-fg",
      )}
    >
      {Number(day.slice(8))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------

function MonthGrid({
  days,
  anchor,
  today,
  byDay,
  onCreate,
  onEdit,
}: {
  days: string[];
  anchor: string;
  today: string;
  byDay: Map<string, { events: EventData[]; tasks: CalendarTask[] }>;
  onCreate: (date: string, start?: number, allDay?: boolean) => void;
  onEdit: (event: EventData) => void;
}) {
  const MAX_ITEMS = 3;
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <div className="grid grid-cols-7 text-center text-xs font-medium text-subtle" aria-hidden>
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <ol className="grid grid-cols-7 border-t border-line" aria-label={formatDate(anchor, { month: "long", year: "numeric" })}>
        {days.map((day, index) => {
          const { events, tasks } = byDay.get(day) ?? { events: [], tasks: [] };
          const items = events.length + tasks.length;
          const outside = !isSameMonth(day, anchor);
          const isToday = day === today;
          const label = formatDate(day, { weekday: "long", month: "long", day: "numeric" });
          return (
            <li
              key={day}
              className={cn(
                "group relative min-h-16 border-line p-1 sm:min-h-28 sm:p-1.5",
                index % 7 !== 6 && "border-r",
                index < days.length - 7 && "border-b",
                outside && "bg-surface-2/50",
              )}
              onClick={(e) => {
                if (e.target === e.currentTarget) onCreate(day);
              }}
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/calendar?view=day&date=${day}`}
                  className="rounded-full transition-colors hover:bg-surface-2"
                  aria-label={`${label}${isToday ? " (today)" : ""}, ${items} ${items === 1 ? "item" : "items"}. Open day view`}
                >
                  <DayNumber day={day} isToday={isToday} outside={outside} />
                </Link>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  className="hidden size-6 place-items-center rounded-md text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 sm:grid"
                  aria-label={`Add event on ${label}`}
                >
                  <Plus className="size-3.5" aria-hidden />
                </button>
              </div>

              {/* Phones: tone dots only */}
              {items > 0 ? (
                <div className="mt-1 flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden>
                  {events.slice(0, 4).map((e) => (
                    <span key={e.id} data-tone={e.color} className="tone-dot size-1.5 rounded-full" />
                  ))}
                  {tasks.length > 0 ? <span className="size-1.5 rounded-full bg-subtle" /> : null}
                </div>
              ) : null}

              {/* Larger screens: event and task chips */}
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {events.slice(0, MAX_ITEMS).map((event) => (
                  <li key={event.id}>
                    <EventChip event={event} onEdit={onEdit} />
                  </li>
                ))}
                {tasks.slice(0, Math.max(0, MAX_ITEMS - events.length)).map((task) => (
                  <li key={task.id}>
                    <TaskChip task={task} />
                  </li>
                ))}
              </ul>
              {items > MAX_ITEMS ? (
                <TextLink href={`/calendar?view=day&date=${day}`} className="mt-0.5 hidden px-1.5 text-xs sm:block">
                  {items - MAX_ITEMS} more
                </TextLink>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EventChip({ event, onEdit }: { event: EventData; onEdit: (e: EventData) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(event)}
      data-tone={event.color}
      className="tone-soft flex min-h-6 w-full items-center gap-1.5 truncate rounded-[5px] px-1.5 text-left text-xs transition-colors"
      aria-label={`${event.title}, ${event.allDay ? "all day" : formatTimeRange(event.startMinute, event.endMinute)}. Edit`}
    >
      {!event.allDay ? <span className="shrink-0 text-muted tabular-nums">{formatMinutes(event.startMinute).replace(":00", "")}</span> : null}
      <span className="truncate font-medium">{event.title}</span>
    </button>
  );
}

function TaskChip({ task }: { task: CalendarTask }) {
  const Icon = task.done ? CheckSquare : Square;
  return (
    <Link
      href={`/planner?date=${task.dueDate}`}
      className={cn("flex min-h-6 items-center gap-1.5 truncate rounded-[5px] px-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg", task.done && "line-through")}
      title={`Task: ${task.title}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">Task{task.done ? " (done)" : ""}: </span>
      <span className="truncate">{task.title}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Week and day views
// ---------------------------------------------------------------------------

function TimeGrid({
  days,
  today,
  timeZone,
  initialNowMinute,
  byDay,
  onCreate,
  onEdit,
}: {
  days: string[];
  today: string;
  timeZone: string;
  initialNowMinute: number;
  byDay: Map<string, { events: EventData[]; tasks: CalendarTask[] }>;
  onCreate: (date: string, start?: number, allDay?: boolean) => void;
  onEdit: (event: EventData) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState({ day: today, minute: initialNowMinute });

  useEffect(() => {
    const tick = () => setNow({ day: todayInTimeZone(timeZone), minute: minutesNowInTimeZone(timeZone) });
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [timeZone]);

  const rangeKey = days.join(",");
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focusMinute = days.includes(today) ? Math.max(0, initialNowMinute - 90) : 7 * 60;
    el.scrollTop = (focusMinute / 60) * HOUR_HEIGHT;
    // Only when the visible range changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  const columns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
  const hasAllDay = days.some((d) => {
    const item = byDay.get(d);
    return item && (item.events.some((e) => e.allDay) || item.tasks.length > 0);
  });

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: columns }}>
        <div />
        {days.map((day) => (
          <div key={day} className="px-1 py-2 text-center">
            <Link
              href={`/calendar?view=day&date=${day}`}
              className="inline-flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-2"
              aria-label={formatDate(day, { weekday: "long", month: "long", day: "numeric" })}
            >
              <span className="text-xs font-medium text-subtle">{WEEKDAYS[dayOfWeek(day)]}</span>
              <DayNumber day={day} isToday={day === today} size="lg" />
            </Link>
          </div>
        ))}
      </div>

      {/* All-day events and tasks */}
      {hasAllDay ? (
        <div className="grid border-t border-line" style={{ gridTemplateColumns: columns }}>
          <div className="px-1.5 py-1.5 text-right text-micro text-subtle">all day</div>
          {days.map((day) => {
            const item = byDay.get(day);
            return (
              <ul key={day} className="min-w-0 space-y-0.5 border-l border-line p-1">
                {item?.events.filter((e) => e.allDay).map((event) => (
                  <li key={event.id}><EventChip event={event} onEdit={onEdit} /></li>
                ))}
                {item?.tasks.map((task) => (
                  <li key={task.id}><TaskChip task={task} /></li>
                ))}
              </ul>
            );
          })}
        </div>
      ) : null}

      {/* Timed grid */}
      <div ref={scrollRef} className="relative max-h-[calc(100dvh-15rem)] min-h-96 overflow-y-auto border-t border-line">
        <div className="grid" style={{ gridTemplateColumns: columns, height: HOUR_HEIGHT * 24 }}>
          <div className="relative" aria-hidden>
            {Array.from({ length: 23 }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-micro text-subtle tabular-nums" style={{ top: (i + 1) * HOUR_HEIGHT }}>
                {formatMinutes((i + 1) * 60).replace(":00", "")}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const timed = (byDay.get(day)?.events ?? []).filter((e) => !e.allDay);
            const placed = layoutTimedEvents(timed);
            return (
              <div
                key={day}
                className={cn("relative border-l border-line", day === today && "bg-primary-soft/35")}
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--line) ${HOUR_HEIGHT - 1}px, var(--line) ${HOUR_HEIGHT}px)`,
                }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minute = Math.floor(((e.clientY - rect.top) / rect.height) * 48) * 30;
                  onCreate(day, Math.min(Math.max(minute, 0), 1410));
                }}
              >
                <button
                  type="button"
                  className="sr-only focus:not-sr-only focus:absolute focus:top-1 focus:left-1 focus:z-10 focus:rounded focus:bg-surface focus:px-2 focus:py-1 focus:text-xs"
                  onClick={() => onCreate(day)}
                >
                  Add event on {formatDate(day, { weekday: "long", month: "long", day: "numeric" })}
                </button>
                {placed.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEdit(event)}
                    data-tone={event.color}
                    className="tone-soft absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-xs ring-2 ring-surface transition-colors hover:z-10 focus-visible:z-10"
                    style={{
                      top: `${event.box.top}%`,
                      height: `${event.box.height}%`,
                      left: `calc(${event.box.left}% + 2px)`,
                      width: `calc(${event.box.width}% - 4px)`,
                    }}
                    aria-label={`${event.title}, ${formatTimeRange(event.startMinute, event.endMinute)}${event.location ? `, ${event.location}` : ""}. Edit`}
                  >
                    <span className="block truncate font-semibold">{event.title}</span>
                    <span className="block truncate text-muted tabular-nums">{formatTimeRange(event.startMinute, event.endMinute)}</span>
                    {event.location && event.endMinute - event.startMinute >= 60 ? (
                      <span className="mt-0.5 flex items-center gap-0.5 truncate text-muted">
                        <MapPin className="size-3 shrink-0" aria-hidden />
                        {event.location}
                      </span>
                    ) : null}
                  </button>
                ))}
                {now.day === day ? (
                  <div className="pointer-events-none absolute right-0 left-0 z-20 flex items-center" style={{ top: `${(now.minute / 1440) * 100}%` }} aria-hidden>
                    <span className="-ml-1 size-2 rounded-full bg-primary-ink" />
                    <span className="h-0.5 flex-1 bg-primary-ink" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
