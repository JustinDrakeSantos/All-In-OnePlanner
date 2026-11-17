"use client";

import { Repeat } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { DemoFrame } from "./demo-frame";

const TASKS = [
  { id: "a", title: "Finish problem set 3", due: "Was due yesterday", overdue: true, list: "School", tone: "lemon", high: true },
  { id: "b", title: "Email the internship coordinator", due: "Today", list: "Work", tone: "navy", high: true },
  { id: "c", title: "Read chapter 5 for seminar", due: "Today", list: "School", tone: "lemon" },
  { id: "d", title: "Water the plants", due: "Today", list: "Personal", tone: "glacier", repeats: "Weekly" },
] as const;

const STARTING_STREAK = 4;

/** The real task row styles and checkbox, with local state instead of the server. */
export function TasksDemo() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const streak = STARTING_STREAK + (done.size > 0 ? 1 : 0);
  const allDone = done.size === TASKS.length;

  const toggle = (id: string, checked: boolean) =>
    setDone((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <DemoFrame title="Tasks" hint="Check a task off." onReset={() => setDone(new Set())}>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_15rem]">
        <ul className="divide-y divide-line">
          {TASKS.map((task) => {
            const isDone = done.has(task.id);
            return (
              <li key={task.id} className="flex items-start gap-3 py-3">
                <Checkbox
                  className="mt-0.5"
                  checked={isDone}
                  onChange={(e) => toggle(task.id, e.target.checked)}
                  aria-label={`${task.title}: mark as ${isDone ? "not done" : "done"}`}
                />
                <div className={cn("min-w-0 flex-1 transition-opacity duration-300", isDone && "opacity-55")}>
                  <p className={cn("text-panel leading-snug decoration-muted/70", isDone && "line-through")}>{task.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-meta text-muted">
                    <span className={"overdue" in task && !isDone ? "font-medium text-danger" : undefined}>{task.due}</span>
                    {"high" in task ? <span className="font-medium text-fg">High priority</span> : null}
                    <span className="inline-flex items-center gap-1.5">
                      <span data-tone={task.tone} className="tone-dot size-2 rounded-full" aria-hidden />
                      {task.list}
                    </span>
                    {"repeats" in task ? (
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="size-3" aria-hidden />
                        {task.repeats}
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="self-start rounded-2xl bg-surface-2 p-5">
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-muted">Done today</span>
            <span className="font-semibold tabular-nums">
              {done.size} / {TASKS.length}
            </span>
          </div>
          <ProgressBar value={done.size} max={TASKS.length} label="Tasks done today" />
          <div className="mt-4 flex items-baseline justify-between text-sm">
            <span className="text-muted">Task streak</span>
            {/* Re-keyed when the streak grows, so the number pops once. */}
            <span key={streak} className={cn("rounded-md px-1.5 font-semibold tabular-nums", done.size > 0 && "animate-pop bg-accent text-accent-fg")}>
              {streak} days
            </span>
          </div>
          <p className="mt-4 text-sm text-muted" aria-live="polite">
            {allDone ? "Everything due today is done." : done.size > 0 ? "Streak extended for today." : "Finish one task to keep your streak going."}
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
