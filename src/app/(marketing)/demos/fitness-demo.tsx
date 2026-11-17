"use client";

import { Check, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { DemoFrame } from "./demo-frame";

const WATER_GOAL = 64;
const WATER_START = [16, 8];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = DAYS.length - 1;

interface Habit {
  id: string;
  name: string;
  tone: Tone;
  target: number;
  done: boolean[];
}

const HABITS: Habit[] = [
  { id: "stretch", name: "Stretch", tone: "glacier", target: 7, done: [true, true, true, true, true, true, false] },
  { id: "read", name: "Read 20 pages", tone: "lemon", target: 5, done: [true, false, true, true, false, true, false] },
  { id: "walk", name: "Walk after lunch", tone: "navy", target: 4, done: [false, true, false, true, true, false, false] },
];

/** Consecutive days ending today (or yesterday, if today isn't checked yet). */
function streak(done: boolean[]) {
  let day = done[TODAY] ? TODAY : TODAY - 1;
  let count = 0;
  while (day >= 0 && done[day]) {
    count += 1;
    day -= 1;
  }
  return count;
}

/** Water quick-adds and a habit week, using the app's real progress bar and habit toggles. */
export function FitnessDemo() {
  const [water, setWater] = useState<number[]>(WATER_START);
  const [habits, setHabits] = useState<Habit[]>(HABITS);
  const total = water.reduce((sum, v) => sum + v, 0);
  const reached = total >= WATER_GOAL;

  const toggle = (id: string, day: number) =>
    setHabits((current) =>
      current.map((h) => (h.id === id ? { ...h, done: h.done.map((d, i) => (i === day ? !d : d)) } : h)),
    );

  return (
    <DemoFrame
      title="Fitness & habits"
      hint="Log water, or check off a habit."
      onReset={() => {
        setWater(WATER_START);
        setHabits(HABITS);
      }}
    >
      <div className="grid gap-10 md:grid-cols-[15rem_minmax(0,1fr)]">
        <section aria-labelledby="demo-water">
          <h3 id="demo-water" className="mb-3 text-sm font-medium">
            Water today
          </h3>
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums">{total}</span>
            <span className="text-sm text-muted tabular-nums">of {WATER_GOAL} oz</span>
            {reached ? (
              <span className="ml-auto animate-pop rounded-md bg-accent px-1.5 text-xs font-semibold text-accent-fg">Goal reached</span>
            ) : null}
          </p>
          <ProgressBar className="mt-3" value={total} max={WATER_GOAL} label="Water toward today's goal" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[8, 16].map((amount) => (
              <Button key={amount} variant="outline" size="sm" className="tabular-nums" onClick={() => setWater((w) => [...w, amount])}>
                +{amount} oz
              </Button>
            ))}
            {water.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setWater((w) => w.slice(0, -1))} aria-label="Undo last water entry">
                <Undo2 className="size-4" aria-hidden /> Undo
              </Button>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="demo-habits" className="min-w-0">
          <h3 id="demo-habits" className="mb-1 text-sm font-medium">
            Habits this week
          </h3>
          <ul className="divide-y divide-line">
            {habits.map((habit) => {
              const thisWeek = habit.done.filter(Boolean).length;
              const days = streak(habit.done);
              return (
                <li key={habit.id} className="flex flex-wrap items-center gap-3 py-3">
                  {/* min-w-32: on narrow screens the day toggles wrap under the name instead of squeezing it. */}
                  <div className="min-w-32 flex-1">
                    <p className="truncate text-sm font-medium">{habit.name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {thisWeek} of {habit.target} this week
                      {days > 1 ? <span className="ml-2">{days}-day streak</span> : null}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {habit.done.map((checked, day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={checked}
                        aria-label={`${habit.name}, ${day === TODAY ? "today" : DAYS[day]}: ${checked ? "done" : "not done"}`}
                        onClick={() => toggle(habit.id, day)}
                        data-tone={habit.tone}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg transition-colors",
                          checked ? "tone-solid animate-pop" : "bg-surface ring-1 ring-input ring-inset hover:ring-primary",
                          day === TODAY && !checked && "ring-2 ring-primary",
                        )}
                      >
                        {checked ? (
                          <Check className="size-4" strokeWidth={3} aria-hidden />
                        ) : (
                          <span className="text-micro text-muted">{DAYS[day][0]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </DemoFrame>
  );
}
