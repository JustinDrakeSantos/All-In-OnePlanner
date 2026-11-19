import { CalendarDays, Check, ClipboardList, Dumbbell, ListChecks, NotebookPen, Smile, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { MoodIcon } from "@/components/mood-icon";
import { cn } from "@/lib/cn";
import { DayPlayButton, DaySection } from "./day-fx";
import { SkyWindow } from "./sky";

interface Moment {
  time: string;
  title: string;
  body: string;
  tool: string;
  icon: LucideIcon;
  /** The sky at that hour: background and text. */
  sky: string;
  /** A small piece of the real interface, for a few of the cards. */
  detail?: ReactNode;
}

/*
 * Each card's detail has a moment that plays when the sun reaches it (the "moments" switch in
 * day-fx.tsx): a task checks off, an event lands on Tuesday, the streak ticks up, the water goal is
 * reached, an entry writes itself, the mood lifts. The m-* classes (globals.css) move from the
 * "before" to the "after" state with --on; without it, every card simply shows the after state.
 */
const DAY: Moment[] = [
  {
    time: "7:30 AM",
    title: "Plan the day",
    body: "Classes, tasks, and whatever's left from yesterday on one page.",
    tool: "Daily Planner",
    icon: ClipboardList,
    sky: "bg-sky-dawn/75 text-ink",
    detail: (
      <ul className="space-y-1.5 text-meta">
        <li className="flex items-center gap-2">
          <span className="grid size-4 place-items-center rounded bg-ink text-sky-dawn">
            <Check className="size-3" strokeWidth={3.5} />
          </span>
          <span className="line-through opacity-70">Finish CS homework</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="relative grid size-4 place-items-center rounded ring-[1.5px] ring-ink/40 ring-inset">
            <span className="m-on absolute inset-0 rounded bg-ink" />
            <Check className="m-pop relative size-3 text-sky-dawn" strokeWidth={3.5} />
          </span>
          <span className="m-strike">Read chapter 5</span>
        </li>
      </ul>
    ),
  },
  {
    time: "9:00 AM",
    title: "Study group",
    body: "Events sit beside the tasks due that day.",
    tool: "Calendar",
    icon: CalendarDays,
    sky: "bg-sky-morning/60 text-ink",
    detail: (
      <div aria-hidden className="grid grid-cols-5 gap-1 text-center text-micro opacity-80">
        {["M", "T", "W", "T", "F"].map((day, i) => (
          <div key={i} className="space-y-1">
            <span>{day}</span>
            <div className="relative h-9 rounded-md bg-ink/[0.07]">
              {i === 1 ? <span className="m-pop absolute inset-x-0.5 top-1.5 h-3.5 rounded bg-sky-evening" /> : null}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    time: "1:00 PM",
    title: "Check things off",
    body: "Each finished task keeps your streak going.",
    tool: "Tasks",
    icon: ListChecks,
    sky: "bg-sky-noon/70 text-ink",
    detail: (
      <span className="inline-flex items-baseline rounded-md bg-accent px-2 py-0.5 text-meta font-semibold text-ink">
        {/* The count rolls from 5 to 6, like an odometer. */}
        <span aria-hidden className="inline-block h-[1lh] overflow-clip">
          <span className="m-roll block">
            <span className="block">5</span>
            <span className="block">6</span>
          </span>
        </span>
        <span className="sr-only">6</span>-day streak
      </span>
    ),
  },
  {
    time: "6:00 PM",
    title: "Evening run",
    body: "Log the workout, your water, and today's habits.",
    tool: "Fitness",
    icon: Dumbbell,
    sky: "bg-sky-evening/75 text-ink",
    detail: (
      <div className="text-meta">
        <p className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">Water</span>
          <span className="m-swap tabular-nums">
            <span aria-hidden className="m-off">46 of 68 oz</span>
            <span className="m-on font-semibold">Goal reached</span>
          </span>
        </p>
        <div className="mt-1.5 h-1.5 overflow-clip rounded-full bg-ink/15">
          <div className="m-bar h-full rounded-full bg-ink [--from:0.68]" />
        </div>
      </div>
    ),
  },
  {
    time: "9:30 PM",
    title: "Write it down",
    body: "Start from a prompt or a blank page.",
    tool: "Journal",
    icon: NotebookPen,
    sky: "bg-sky-dusk/85 text-paper",
    detail: (
      <p className="rounded-xl bg-paper/10 px-3 py-2 text-meta">
        <span className="m-write block">&ldquo;A stressful afternoon turned into a good one.&rdquo;</span>
      </p>
    ),
  },
  {
    time: "10:00 PM",
    title: "How did it feel?",
    body: "A ten-second check-in, charted over the month.",
    tool: "Mood",
    icon: Smile,
    sky: "bg-sky-night/85 text-paper",
    detail: (
      <p className="flex items-center gap-2.5 rounded-xl bg-paper/10 px-3 py-2 text-meta">
        <span className="m-swap">
          <MoodIcon value={3} className="m-off size-5" />
          <MoodIcon value={4} className="m-pop size-5 text-[var(--gold-500)]" />
        </span>
        <span className="m-swap font-semibold">
          <span aria-hidden className="m-off">Okay</span>
          <span className="m-on">Good</span>
        </span>
      </p>
    ),
  },
];

/*
 * On wide screens the six moments hang from the sun's path across the day: an
 * arc through one marker per column. The arc is a quadratic curve in a 100-wide
 * box; DOT is where it crosses each column's center, in pixels from the top.
 */
const ARC = "M 8.333 102 Q 50 -6 91.667 102";
const DOT = [102, 67.4, 50.2, 50.2, 67.4, 102];

/** A Tuesday, morning to night: one pane of glass per part of the app, tinted like the sky at that hour. */
export function DayTimeline() {
  return (
    <DaySection aria-labelledby="day-heading" className="day-section grid-paper wash-band relative bg-stage/55 pt-12 pb-12 md:pt-14 md:pb-14">
      <SkyWindow id="day" />
      {/* The light in the band follows the sun: warm at dawn, deep blue by night (decorative). */}
      <div aria-hidden className="day-tint" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="max-w-2xl">
          <h2 id="day-heading" className="font-display font-semibold tracking-[-0.025em] text-4xl text-fg sm:text-5xl">
            From morning plan to <em className="text-primary-ink">lights out</em>
          </h2>
          <p className="mt-3 text-lg text-muted">Here&apos;s a Tuesday with All-In Planner. Every part of it lands in the same place.</p>
        </div>
        <DayPlayButton className="mb-1" />
        </div>

        <ol className="relative mt-10 grid gap-3 pl-8 lg:mt-6 lg:grid-cols-6 lg:gap-0 lg:pl-0">
          {/* Narrow screens: a rail down the left. Wide screens: the sun's path. */}
          <span aria-hidden className="absolute top-4 bottom-4 left-[11px] w-0.5 rounded-full bg-fg/10 lg:hidden" />
          {/* The line draws in from morning to night as the section arrives (decorative). */}
          <svg aria-hidden className="arc-reveal pointer-events-none absolute inset-x-0 top-0 hidden h-[140px] w-full overflow-visible lg:block" viewBox="0 0 100 140" preserveAspectRatio="none">
            <path d={ARC} fill="none" stroke="currentColor" strokeOpacity={0.28} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* The sun, riding the arc (wide screens) or the rail (narrow ones) as the section scrolls. */}
          <span aria-hidden className="day-sun" />
          {DAY.map((moment, index) => {
            const Icon = moment.icon;
            return (
              <li key={moment.time} className="relative lg:px-1.5" style={{ "--dot": `${DOT[index]}px`, "--i": index } as CSSProperties}>
                {/* Time markers come in one after another, following the line; the cards stay still. */}
                <span
                  aria-hidden
                  className="dot-in absolute top-6 -left-[26px] size-3 rounded-full bg-fg ring-4 ring-stage lg:top-[var(--dot)] lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
                />
                <p aria-hidden className="marker-in absolute inset-x-0 top-[calc(var(--dot)-34px)] hidden text-center text-sm font-semibold text-fg tabular-nums lg:block">
                  {moment.time}
                </p>
                <article data-tilt className={cn("day-card glass-tint flex h-full flex-col rounded-3xl p-5 lg:mt-[calc(var(--dot)+20px)] lg:h-auto", moment.sky)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold tabular-nums lg:sr-only">{moment.time}</p>
                    <span className="grid size-9 place-items-center rounded-full bg-current/10" aria-hidden>
                      <Icon className="size-[18px]" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg leading-snug font-semibold">{moment.title}</h3>
                  <p className="mt-1 text-sm opacity-80">{moment.body}</p>
                  {moment.detail ? <div className="mt-4">{moment.detail}</div> : null}
                  <p className="mt-auto pt-5 text-meta font-medium opacity-70">{moment.tool}</p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </DaySection>
  );
}
