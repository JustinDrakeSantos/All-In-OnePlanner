import { ArrowRight, Bell, Check, Dumbbell } from "lucide-react";
import type { ReactNode } from "react";
import { MoodIcon } from "@/components/mood-icon";
import { SkyWindow } from "./sky";

/*
 * One evening run, followed through the app. Every step is something the app
 * really does: events are added from the Daily Planner's schedule, appear on
 * the calendar and the dashboard (marked Next), can carry a reminder; workouts,
 * water, and habits are logged in Fitness; the planner's Reflect panel links to
 * that day's mood check-in and journal entry, and an entry shows that day's mood.
 *
 * The run is marked in lemon in every step, so the eye can follow it.
 */

function Row({ time, title, note, highlight = false }: { time: string; title: string; note?: ReactNode; highlight?: boolean }) {
  return (
    <div className={highlight ? "flex items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 ring-2 ring-accent-ink" : "flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2"}>
      <span className="w-14 shrink-0 text-meta text-muted tabular-nums">{time}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      {note}
    </div>
  );
}

const STEPS: { title: string; body: string; mock: ReactNode }[] = [
  {
    title: "Plan it",
    body: "Add an evening run to today's schedule in the Daily Planner, with a reminder.",
    mock: (
      <div className="space-y-2">
        <p className="text-meta font-semibold text-muted">Schedule</p>
        <Row time="9:00 AM" title="Study group" />
        <Row time="6:00 PM" title="Evening run" highlight />
        <p className="flex items-center gap-1.5 pt-1 text-meta text-muted">
          <Bell className="size-3.5" aria-hidden /> Reminder 15 minutes before
        </p>
      </div>
    ),
  },
  {
    title: "See it everywhere",
    body: "It shows on your calendar and on the dashboard, marked Next.",
    mock: (
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-1 text-center text-micro text-muted">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <div key={i} className="space-y-1">
              <span>{day}</span>
              <div className={i === 1 ? "relative h-14 rounded-md bg-surface-2" : "h-14 rounded-md bg-surface-2"}>
                {i === 1 ? <span className="absolute inset-x-0.5 bottom-1.5 h-5 rounded bg-accent" /> : null}
              </div>
            </div>
          ))}
        </div>
        <Row time="6:00 PM" title="Evening run" highlight note={<span className="rounded bg-secondary px-1.5 text-micro font-semibold text-secondary-fg">Next</span>} />
      </div>
    ),
  },
  {
    title: "Log the run",
    body: "Afterwards, log the workout, your water, and today's habits in Fitness.",
    mock: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 ring-2 ring-accent-ink">
          <Dumbbell className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Evening run</span>
            <span className="block text-meta text-muted tabular-nums">Run, 45 min, 7.5 km</span>
          </span>
        </div>
        <div>
          <p className="flex items-baseline justify-between text-meta">
            <span className="font-semibold tabular-nums">70 of 68 oz</span>
            <span className="rounded bg-accent px-1.5 font-semibold text-accent-fg">Goal reached</span>
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-chart-1" />
        </div>
        <p className="flex items-center gap-2 text-sm">
          <span className="grid size-5 place-items-center rounded-md bg-primary text-primary-fg">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
          Stretch for 10 minutes
        </p>
      </div>
    ),
  },
  {
    title: "Reflect",
    body: "That night, the planner links to your mood check-in and journal. The entry shows how you felt.",
    mock: (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MoodIcon value={5} className="size-5 text-chart-1" /> Feeling great
        </p>
        <div className="rounded-lg bg-surface-2 px-3 py-2.5">
          <p className="text-sm">Felt strong on the last mile of the run.</p>
          <p className="mt-2 flex items-center gap-1.5 text-meta text-muted">
            <MoodIcon value={5} className="size-3.5" /> Mood that day: Great
          </p>
        </div>
      </div>
    ),
  },
];

/** How the parts of the app hand one plan along through a day. */
export function Connected() {
  return (
    <section
      id="connected"
      aria-labelledby="connected-heading"
      className="relative isolate scroll-mt-20 overflow-clip bg-secondary py-16 text-secondary-fg md:py-20 dark:bg-surface-2 dark:text-fg"
    >
      <SkyWindow id="connected" onDark />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 id="connected-heading" className="font-brand text-4xl tracking-tight sm:text-5xl">
            Your day doesn&apos;t happen in separate apps
          </h2>
          <p className="mt-3 text-lg opacity-80">Follow one evening run through All-In Planner.</p>
        </div>
        {/* One shared timeline (--walk), so the four cards rise together and their edges stay aligned. */}
        <ol className="mt-10 grid gap-x-6 gap-y-10 [view-timeline-name:--walk] md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col">
              {/* Pointing on to the next step. */}
              {index < STEPS.length - 1 ? (
                <ArrowRight aria-hidden className="absolute top-2 -right-5 hidden size-4 text-accent lg:block" />
              ) : null}
              <div className="relative flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg tabular-nums">{index + 1}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm opacity-85 lg:min-h-[3rem]">{step.body}</p>
              <div aria-hidden className="lift-in mt-4 flex-1 rounded-2xl bg-surface p-4 text-fg shadow-pop">
                {step.mock}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
