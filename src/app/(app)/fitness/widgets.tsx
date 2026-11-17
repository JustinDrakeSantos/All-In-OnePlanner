import { TextLink } from "@/components/ui/text-link";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import { toTone } from "@/lib/constants";
import { addDays, type ISODate } from "@/lib/dates";
import { currentStreak } from "@/lib/streaks";
import { mlToDisplay, volumeUnit, waterQuickAdds, type UnitSystem } from "@/lib/units";
import { checkinsBetween, listHabits } from "@/server/data/habits";
import { waterTotalsBetween } from "@/server/data/fitness";
import { quickAddWaterAction, undoWaterAction } from "./actions";
import { HabitDayToggle, WaterCustomForm } from "./fitness-forms";

/** Water progress for a day with one-tap add buttons. */
export async function WaterTracker({
  userId,
  date,
  units,
  goalMl,
  showCustom = true,
}: {
  userId: string;
  date: ISODate;
  units: UnitSystem;
  goalMl: number;
  showCustom?: boolean;
}) {
  const totals = await waterTotalsBetween(userId, date, date);
  const total = totals.get(date) ?? 0;
  const unit = volumeUnit(units);
  const reached = total >= goalMl;
  return (
    <div className="space-y-3">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums">{mlToDisplay(total, units)}</span>
        <span className="text-sm text-muted tabular-nums">
          of {mlToDisplay(goalMl, units)} {unit}
        </span>
        {reached ? <span className="ml-auto rounded-md bg-accent px-1.5 text-xs font-semibold text-accent-fg">Goal reached</span> : null}
      </p>
      <ProgressBar value={total} max={goalMl} label="Water toward today's goal" />
      <div className="flex flex-wrap items-center gap-2">
        {waterQuickAdds(units).map((amount) => (
          <form key={amount} action={quickAddWaterAction.bind(null, date, amount)}>
            <Button type="submit" variant="outline" size="sm" className="tabular-nums">
              +{amount} {unit}
            </Button>
          </form>
        ))}
        {total > 0 ? (
          <form action={undoWaterAction.bind(null, date)}>
            <Button type="submit" variant="ghost" size="sm" aria-label="Undo last water entry" title="Undo last water entry">
              <Undo2 className="size-4" aria-hidden /> Undo
            </Button>
          </form>
        ) : null}
      </div>
      {showCustom ? <WaterCustomForm date={date} units={units} /> : null}
    </div>
  );
}

/** Habits with a check box for each of the last 7 days (or just today when compact). */
export async function HabitGrid({
  userId,
  today,
  compact = false,
}: {
  userId: string;
  today: ISODate;
  compact?: boolean;
}) {
  const from = addDays(today, -59);
  const [habits, checkins] = await Promise.all([listHabits(userId), checkinsBetween(userId, from, today)]);
  if (habits.length === 0) {
    return (
      <p className="text-sm text-muted">
        No habits yet.{" "}
        <TextLink href="/fitness?tab=habits">
          Start one
        </TextLink>
      </p>
    );
  }
  const days = compact ? [today] : Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekStart = addDays(today, -6);

  return (
    <ul className={compact ? "space-y-2.5" : "divide-y divide-line"}>
      {habits.map((habit) => {
        const done = checkins.get(habit.id) ?? new Set<string>();
        const last7 = [...done].filter((d) => d >= weekStart).length;
        const streak = currentStreak(done, today);
        return (
          <li key={habit.id} className={compact ? "flex items-center gap-3" : "flex flex-wrap items-center gap-3 py-3"}>
            {/* min-w-32: on narrow screens the week of toggles wraps under the name instead of squeezing it. */}
            <div className={compact ? "min-w-0 flex-1" : "min-w-32 flex-1"}>
              <p className="truncate text-sm font-medium">{habit.name}</p>
              <p className="text-xs text-muted tabular-nums">
                {last7} of {habit.targetPerWeek} this week
                {streak > 1 ? <span className="ml-2">{streak}-day streak</span> : null}
              </p>
            </div>
            <div className="flex gap-1">
              {days.map((day) => (
                <HabitDayToggle
                  key={day}
                  habitId={habit.id}
                  habitName={habit.name}
                  date={day}
                  done={done.has(day)}
                  tone={toTone(habit.color)}
                  today={today}
                  showLabel={!compact}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
