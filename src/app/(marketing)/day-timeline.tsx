import { CalendarDays, Check, ClipboardList, Dumbbell, ListChecks, NotebookPen, Smile, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
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

const DAY: Moment[] = [
  {
    time: "7:30 AM",
    title: "Plan the day",
    body: "Classes, tasks, and whatever's left from yesterday on one page.",
    tool: "Daily Planner",
    icon: ClipboardList,
    sky: "bg-sky-dawn text-ink",
    detail: (
      <ul className="space-y-1.5 text-meta">
        <li className="flex items-center gap-2">
          <span className="grid size-4 place-items-center rounded bg-ink text-sky-dawn">
            <Check className="size-3" strokeWidth={3.5} />
          </span>
          <span className="line-through opacity-70">Finish CS homework</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-4 rounded ring-[1.5px] ring-ink/40 ring-inset" />
          Read chapter 5
        </li>
      </ul>
    ),
  },
  { time: "9:00 AM", title: "Study group", body: "Events sit beside the tasks due that day.", tool: "Calendar", icon: CalendarDays, sky: "bg-sky-morning text-ink" },
  {
    time: "1:00 PM",
    title: "Check things off",
    body: "Each finished task keeps your streak going.",
    tool: "Tasks",
    icon: ListChecks,
    sky: "bg-sky-noon text-ink",
    detail: <span className="inline-block rounded-md bg-accent px-2 py-0.5 text-meta font-semibold text-ink">6-day streak</span>,
  },
  { time: "6:00 PM", title: "Evening run", body: "Log the workout, your water, and today's habits.", tool: "Fitness", icon: Dumbbell, sky: "bg-sky-evening text-ink" },
  {
    time: "9:30 PM",
    title: "Write it down",
    body: "Start from a prompt or a blank page.",
    tool: "Journal",
    icon: NotebookPen,
    sky: "bg-sky-dusk text-paper",
    detail: <p className="rounded-xl bg-paper/10 px-3 py-2 text-meta">&ldquo;A stressful afternoon turned into a good one.&rdquo;</p>,
  },
  { time: "10:00 PM", title: "How did it feel?", body: "A ten-second check-in, charted over the month.", tool: "Mood", icon: Smile, sky: "bg-sky-night text-paper" },
];

/*
 * On wide screens the six moments hang from the sun's path across the day: an
 * arc through one marker per column. The arc is a quadratic curve in a 100-wide
 * box; DOT is where it crosses each column's center, in pixels from the top.
 */
const ARC = "M 8.333 102 Q 50 -6 91.667 102";
const DOT = [102, 67.4, 50.2, 50.2, 67.4, 102];

/** A Tuesday, morning to night: one card per part of the app, tinted like the sky at that hour. */
export function DayTimeline() {
  return (
    <section aria-labelledby="day-heading" className="grid-paper relative bg-stage pt-12 pb-12 md:pt-14 md:pb-14">
      <SkyWindow id="day" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 id="day-heading" className="font-brand text-4xl tracking-tight text-fg sm:text-5xl">
            From morning plan to lights out
          </h2>
          <p className="mt-3 text-lg text-muted">Here&apos;s a Tuesday with All-In Planner. Every part of it lands in the same place.</p>
        </div>

        <ol className="relative mt-10 grid gap-3 pl-8 lg:mt-6 lg:grid-cols-6 lg:gap-0 lg:pl-0">
          {/* Narrow screens: a rail down the left. Wide screens: the sun's path. */}
          <span aria-hidden className="absolute top-4 bottom-4 left-[11px] w-0.5 rounded-full bg-fg/10 lg:hidden" />
          {/* The line draws in from morning to night as the section arrives (decorative). */}
          <svg aria-hidden className="arc-reveal pointer-events-none absolute inset-x-0 top-0 hidden h-[140px] w-full overflow-visible lg:block" viewBox="0 0 100 140" preserveAspectRatio="none">
            <path d={ARC} fill="none" stroke="currentColor" strokeOpacity={0.28} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

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
                <article className={cn("flex h-full flex-col rounded-3xl p-5 lg:mt-[calc(var(--dot)+20px)] lg:h-auto", moment.sky)}>
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
    </section>
  );
}
