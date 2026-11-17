"use client";

import { useState } from "react";
import { layoutTimedEvents } from "@/lib/calendar-layout";
import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatMinutes } from "@/lib/dates";
import { DemoFrame } from "./demo-frame";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/** Days shown when the frame is narrow (phones); the rest appear from 32rem up. */
const NARROW_DAYS = 3;
const START = 8 * 60;
const END = 18 * 60;
const SPAN = END - START;
const HOUR_PX = 40;
const MAX_EVENTS = 14;
const NEW_TONES: Tone[] = ["glacier", "navy", "slate", "lemon"];
/** layoutTimedEvents works on a 24-hour column; working hours are stretched onto it. */
const SCALE = 1440 / SPAN;

interface DemoEvent {
  id: string;
  day: number;
  title: string;
  startMinute: number;
  endMinute: number;
  tone: Tone;
}

const INITIAL: DemoEvent[] = [
  { id: "1", day: 0, title: "Study group", startMinute: 9 * 60, endMinute: 10 * 60 + 30, tone: "glacier" },
  { id: "2", day: 1, title: "Lunch with Sam", startMinute: 12 * 60 + 30, endMinute: 13 * 60 + 30, tone: "slate" },
  { id: "3", day: 1, title: "Team sync", startMinute: 13 * 60, endMinute: 14 * 60, tone: "navy" },
  { id: "4", day: 2, title: "Seminar", startMinute: 10 * 60, endMinute: 11 * 60 + 30, tone: "glacier" },
  { id: "5", day: 3, title: "Dentist", startMinute: 15 * 60, endMinute: 16 * 60, tone: "slate" },
  { id: "6", day: 4, title: "Evening run", startMinute: 16 * 60 + 30, endMinute: 17 * 60 + 30, tone: "lemon" },
];

const wideOnly = (day: number) => (day >= NARROW_DAYS ? "hidden @lg:block" : undefined);

/**
 * A working-hours week. Click a free hour to add an event, click an event to
 * remove it. Overlaps are laid out by the same code the real calendar uses.
 */
export function CalendarDemo() {
  const [events, setEvents] = useState<DemoEvent[]>(INITIAL);
  const [added, setAdded] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const add = (day: number, hour: number) => {
    if (events.length >= MAX_EVENTS) {
      setAnnouncement(`The demo holds ${MAX_EVENTS} events. Remove one or reset to add more.`);
      return;
    }
    const startMinute = hour * 60;
    const event: DemoEvent = {
      id: `new-${added}`,
      day,
      title: "New event",
      startMinute,
      endMinute: Math.min(startMinute + 60, END),
      tone: NEW_TONES[added % NEW_TONES.length],
    };
    setEvents((current) => [...current, event]);
    setAdded((n) => n + 1);
    setAnnouncement(`Added an event on ${DAYS[day]} at ${formatMinutes(startMinute)}.`);
  };

  const remove = (event: DemoEvent) => {
    setEvents((current) => current.filter((e) => e.id !== event.id));
    setAnnouncement(`Removed ${event.title} on ${DAYS[event.day]}.`);
  };

  return (
    <DemoFrame
      title="Calendar"
      hint="Click a free hour to add an event. Click an event to remove it."
      onReset={() => {
        setEvents(INITIAL);
        setAdded(0);
        setAnnouncement("Calendar reset.");
      }}
    >
      <div className="@container">
        <div className="grid grid-cols-[2.75rem_repeat(3,minmax(0,1fr))] pb-2 text-center text-xs font-medium text-subtle @lg:grid-cols-[3rem_repeat(5,minmax(0,1fr))]">
          <span />
          {DAYS.map((d, day) => (
            <span key={d} className={wideOnly(day)}>
              {d}
            </span>
          ))}
        </div>
        <div
          className="grid grid-cols-[2.75rem_repeat(3,minmax(0,1fr))] border-t border-line @lg:grid-cols-[3rem_repeat(5,minmax(0,1fr))]"
          style={{ height: (SPAN / 60) * HOUR_PX }}
        >
          <div className="relative" aria-hidden>
            {Array.from({ length: SPAN / 60 - 1 }, (_, i) => (
              <span
                key={i}
                className="absolute right-2 -translate-y-1/2 text-micro whitespace-nowrap text-subtle tabular-nums"
                style={{ top: (i + 1) * HOUR_PX }}
              >
                {formatMinutes(START + (i + 1) * 60).replace(":00", "")}
              </span>
            ))}
          </div>
          {DAYS.map((dayName, day) => {
            const placed = layoutTimedEvents(
              events
                .filter((e) => e.day === day)
                .map((e) => ({ ...e, startMinute: (e.startMinute - START) * SCALE, endMinute: (e.endMinute - START) * SCALE })),
              20 * SCALE,
            );
            return (
              <div key={dayName} className={cn("relative border-l border-line", wideOnly(day))}>
                {Array.from({ length: SPAN / 60 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => add(day, START / 60 + i)}
                    className="absolute inset-x-0 border-b border-line transition-colors hover:bg-primary-soft/60 focus-visible:z-20"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                    aria-label={`Add an event on ${dayName} at ${formatMinutes(START + i * 60)}`}
                  />
                ))}
                {placed.map((event) => {
                  const start = formatMinutes(event.startMinute / SCALE + START);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => remove(event)}
                      data-tone={event.tone}
                      className="tone-soft absolute z-10 animate-pop overflow-hidden rounded-md px-1.5 py-1 text-left text-xs ring-2 ring-surface transition-[filter] hover:brightness-95 dark:hover:brightness-110"
                      style={{
                        top: `${event.box.top}%`,
                        height: `${event.box.height}%`,
                        left: `calc(${event.box.left}% + 2px)`,
                        width: `calc(${event.box.width}% - 4px)`,
                      }}
                      aria-label={`${event.title}, ${dayName} at ${start}. Remove`}
                    >
                      <span className="block truncate font-semibold">{event.title}</span>
                      <span className="block truncate text-muted tabular-nums">{start}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </DemoFrame>
  );
}
