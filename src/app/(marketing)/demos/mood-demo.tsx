"use client";

import { useState } from "react";
import { LineChart, type Point } from "@/components/charts";
import { MoodIcon } from "@/components/mood-icon";
import { MOOD_SCALE, SELF_CARE_IDEAS, moodLabel } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { DemoFrame } from "./demo-frame";

const WEEK: { label: string; value: number }[] = [
  { label: "Mon", value: 3 },
  { label: "Tue", value: 4 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
];

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const BEFORE = average(WEEK.map((d) => d.value));

/** Check in for "today" and watch the real mood chart and weekly average update. */
export function MoodDemo() {
  const [today, setToday] = useState<number | null>(null);

  const points: Point[] = [
    ...WEEK.map((d) => ({ label: d.label, value: d.value, display: moodLabel(d.value) })),
    { label: "Today", value: today, display: today === null ? undefined : moodLabel(today) },
  ];
  const avg = today === null ? BEFORE : average([...WEEK.map((d) => d.value), today]);

  return (
    <DemoFrame title="Mood" hint="How are you feeling today?" onReset={() => setToday(null)}>
      <div className="grid gap-8 md:grid-cols-[17rem_minmax(0,1fr)]">
        <div>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Today&apos;s check-in</legend>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_SCALE.map((option) => {
                const selected = today === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setToday(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 transition-colors",
                      selected ? "bg-primary-soft text-fg ring-2 ring-primary" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
                    )}
                  >
                    <MoodIcon value={option.value} className={cn("size-7", selected && "animate-pop")} strokeWidth={1.75} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <dl className="mt-5 rounded-xl bg-surface-2 px-4 py-2 text-sm">
            <div className="flex items-baseline justify-between py-1.5">
              <dt className="text-muted">Average this week</dt>
              <dd key={avg.toFixed(1)} className={cn("font-semibold tabular-nums", today !== null && "animate-pop")}>
                {avg.toFixed(1)} of 5
              </dd>
            </div>
            <div className="flex items-baseline justify-between py-1.5">
              <dt className="text-muted">Check-ins</dt>
              <dd className="font-semibold tabular-nums">{WEEK.length + (today === null ? 0 : 1)} of 7 days</dd>
            </div>
          </dl>

          <div aria-live="polite">
            {today !== null && today <= 2 ? (
              <div key="ideas" className="mt-5 animate-rise">
                <p className="text-sm font-medium">A few things that might help</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {SELF_CARE_IDEAS.slice(0, 3).map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium">This week</p>
          <LineChart
            title="Mood this week"
            points={points}
            domain={[1, 5]}
            ticks={MOOD_SCALE.map((m) => ({ value: m.value, label: m.label }))}
            height={230}
          />
        </div>
      </div>
    </DemoFrame>
  );
}
