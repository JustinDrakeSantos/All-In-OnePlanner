import type { Metadata } from "next";
import { Suspense } from "react";
import { ColumnChart, LineChart } from "@/components/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DeleteFormButton } from "@/components/ui/delete-form-button";
import { EmptyState, PageBody, PageHeader, PageSkeleton, ProgressBar, SectionLabel, StatRow, TabLinks } from "@/components/ui/misc";
import { niceDomain } from "@/lib/chart-scale";
import { INTENSITY_LABELS, MEAL_TYPE_LABELS, WORKOUT_TYPE_LABELS } from "@/lib/constants";
import { addDays, dateRange, formatDate, isISODate, relativeDayLabel, type ISODate } from "@/lib/dates";
import { distanceUnit, kgToDisplay, kmToDisplay, mlToDisplay, volumeUnit, weightUnit } from "@/lib/units";
import { requireUser, type CurrentUser } from "@/server/auth/current-user";
import {
  latestWeight,
  mealsOn,
  metricsBetween,
  plannedWorkouts,
  recentWorkouts,
  waterTotalsBetween,
  workoutsBetween,
} from "@/server/data/fitness";
import { listHabits } from "@/server/data/habits";
import { userClock } from "@/server/today";
import { deleteMealAction, deleteWorkoutAction } from "./actions";
import { DeleteHabitButton, HabitForm, MealForm, MetricsForm, WorkoutDoneToggle, WorkoutForm } from "./fitness-forms";
import { HabitGrid, WaterTracker } from "./widgets";

export const metadata: Metadata = { title: "Fitness & Health" };

const TABS = [
  { key: "overview", label: "Today" },
  { key: "workouts", label: "Workouts" },
  { key: "nutrition", label: "Meals & water" },
  { key: "health", label: "Weight, steps & sleep" },
  { key: "habits", label: "Habits" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function FitnessPage({ searchParams }: PageProps<"/fitness">) {
  return (
    <>
      <PageHeader title="Fitness & Health" />
      <Suspense fallback={<PageSkeleton layout="grid" />}>
        <FitnessContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FitnessContent({ searchParams }: { searchParams: PageProps<"/fitness">["searchParams"] }) {
  const user = await requireUser();
  const { today } = userClock(user);
  const params = await searchParams;
  const tab: Tab = TABS.find((t) => t.key === params.tab)?.key ?? "overview";
  const date = isISODate(params.date) && params.date <= today ? params.date : today;

  return (
    <PageBody className="space-y-8 pt-3">
      <div className="border-b border-line">
        <TabLinks label="Fitness sections" active={tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: `/fitness?tab=${t.key}` }))} />
      </div>
      {tab === "overview" ? <Overview user={user} today={today} /> : null}
      {tab === "workouts" ? <Workouts user={user} today={today} /> : null}
      {tab === "nutrition" ? <Nutrition user={user} today={today} date={date} /> : null}
      {tab === "health" ? <Health user={user} today={today} /> : null}
      {tab === "habits" ? <Habits user={user} today={today} /> : null}
    </PageBody>
  );
}

const dayLabel = (d: ISODate) => formatDate(d, { month: "short", day: "numeric" });

// ---------------------------------------------------------------------------

async function Overview({ user, today }: { user: CurrentUser; today: ISODate }) {
  const weekStart = addDays(today, -6);
  const [metrics, week, planned, weight] = await Promise.all([
    metricsBetween(user.id, today, today),
    workoutsBetween(user.id, weekStart, today),
    plannedWorkouts(user.id, today, 3),
    latestWeight(user.id),
  ]);
  const steps = metrics[0]?.steps ?? null;
  const done = week.filter((w) => w.completed);
  const minutes = done.reduce((sum, w) => sum + w.durationMin, 0);

  return (
    <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2">
      <Card>
        <CardHeader title="Water" />
        <CardBody>
          <WaterTracker userId={user.id} date={today} units={user.unitSystem} goalMl={user.waterGoalMl} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Habits" />
        <CardBody>
          <HabitGrid userId={user.id} today={today} compact />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Steps" />
        <CardBody className="space-y-3">
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums">{steps === null ? "0" : steps.toLocaleString("en-US")}</span>
            <span className="text-sm text-muted tabular-nums">of {user.stepGoal.toLocaleString("en-US")}</span>
          </p>
          <ProgressBar value={steps ?? 0} max={user.stepGoal} label="Steps toward today's goal" />
          <MetricsForm today={today} units={user.unitSystem} />
        </CardBody>
      </Card>
      <Card variant="panel">
        <CardHeader title="Last 7 days" headingLevel={3} />
        <CardBody>
          <dl>
            <StatRow label="Workouts" value={done.length} />
            <StatRow label="Active minutes" value={minutes} />
            <StatRow label="Latest weight" value={weight?.weightKg ? `${kgToDisplay(weight.weightKg, user.unitSystem)} ${weightUnit(user.unitSystem)}` : "None logged"} />
          </dl>
          {planned.length ? (
            <div className="mt-4">
              <SectionLabel>Planned</SectionLabel>
              <ul className="space-y-1 text-sm">
                {planned.map((w) => (
                  <li key={w.id} className="flex justify-between gap-3">
                    <span>{w.title}</span>
                    <span className="text-muted tabular-nums">{relativeDayLabel(w.date, today)}, {w.durationMin} min</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Workouts({ user, today }: { user: CurrentUser; today: ISODate }) {
  const from = addDays(today, -13);
  const [range, planned, recent] = await Promise.all([
    workoutsBetween(user.id, from, today),
    plannedWorkouts(user.id, addDays(today, -30), 20),
    recentWorkouts(user.id, 20),
  ]);
  const minutesByDay = new Map<string, number>();
  for (const w of range) if (w.completed) minutesByDay.set(w.date, (minutesByDay.get(w.date) ?? 0) + w.durationMin);
  const points = dateRange(from, today).map((d) => ({ label: dayLabel(d), value: minutesByDay.get(d) ?? 0, display: `${minutesByDay.get(d) ?? 0} min` }));

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-10">
        <Card>
          <CardHeader title="Log a workout" />
          <CardBody>
            <WorkoutForm today={today} units={user.unitSystem} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Active minutes, last 14 days" />
          <CardBody>
            <ColumnChart title="Active minutes per day, last 14 days" points={points} />
          </CardBody>
        </Card>
      </div>
      <div className="space-y-10">
        <Card variant="panel">
          <CardHeader title="Planned" description="Check one off when it's done." headingLevel={3} />
          <CardBody>
            {planned.length === 0 ? (
              <p className="text-sm text-muted">Nothing planned. Tick “Plan it for later” when logging to schedule a session.</p>
            ) : (
              <ul className="divide-y divide-line">
                {planned.map((w) => (
                  <li key={w.id} className="flex items-start gap-3 py-2.5">
                    <WorkoutDoneToggle id={w.id} completed={w.completed} title={w.title} />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{w.title}</p>
                      <p className={w.date < today ? "text-danger" : "text-muted"}>
                        <span className="tabular-nums">{relativeDayLabel(w.date, today)}</span>
                        <span className="ml-3 tabular-nums">{w.durationMin} min</span>
                        <span className="ml-3">{INTENSITY_LABELS[w.intensity]}</span>
                      </p>
                    </div>
                    <DeleteFormButton action={deleteWorkoutAction.bind(null, w.id)} label={`Delete ${w.title}`} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent workouts" />
          <CardBody>
            {recent.length === 0 ? (
              <EmptyState title="No workouts yet">Your history starts with the first one you log.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((w) => (
                  <li key={w.id} className="flex items-start gap-3 py-2.5 text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{w.title}</p>
                      <p className="text-muted">
                        <span>{WORKOUT_TYPE_LABELS[w.type]}</span>
                        <span className="ml-3 tabular-nums">{relativeDayLabel(w.date, today)}</span>
                        <span className="ml-3 tabular-nums">{w.durationMin} min</span>
                        <span className="ml-3">{INTENSITY_LABELS[w.intensity]}</span>
                        {w.distanceKm ? <span className="ml-3 tabular-nums">{kmToDisplay(w.distanceKm, user.unitSystem)} {distanceUnit(user.unitSystem)}</span> : null}
                      </p>
                      {w.notes ? <p className="mt-0.5 text-muted">{w.notes}</p> : null}
                    </div>
                    <DeleteFormButton action={deleteWorkoutAction.bind(null, w.id)} label={`Delete ${w.title}`} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Nutrition({ user, today, date }: { user: CurrentUser; today: ISODate; date: ISODate }) {
  const from = addDays(today, -6);
  const [meals, water] = await Promise.all([mealsOn(user.id, date), waterTotalsBetween(user.id, from, today)]);
  const calories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const unit = volumeUnit(user.unitSystem);
  const waterPoints = dateRange(from, today).map((d) => {
    const amount = mlToDisplay(water.get(d) ?? 0, user.unitSystem);
    return { label: dayLabel(d), value: amount, display: `${amount.toLocaleString("en-US")} ${unit}` };
  });

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={date === today ? "Meals today" : `Meals on ${formatDate(date)}`}
          description={calories > 0 ? `${calories.toLocaleString("en-US")} calories logged` : undefined}
          action={
            <form action="/fitness" className="flex items-center gap-1.5">
              <input type="hidden" name="tab" value="nutrition" />
              <label htmlFor="meal-day" className="sr-only">Day</label>
              <input id="meal-day" type="date" name="date" max={today} defaultValue={date} className="h-8 rounded-lg bg-surface px-2 text-xs ring-1 ring-input ring-inset" />
              <button type="submit" className="h-8 rounded-lg px-2.5 text-xs font-medium ring-1 ring-input ring-inset hover:bg-surface-2">Show</button>
            </form>
          }
        />
        <CardBody className="space-y-6">
          {meals.length === 0 ? (
            <p className="text-sm text-muted">Nothing logged for this day yet.</p>
          ) : (
            <div className="space-y-4">
              {(Object.keys(MEAL_TYPE_LABELS) as (keyof typeof MEAL_TYPE_LABELS)[]).map((type) => {
                const items = meals.filter((m) => m.mealType === type);
                if (items.length === 0) return null;
                return (
                  <section key={type} aria-label={MEAL_TYPE_LABELS[type]}>
                    <SectionLabel>{MEAL_TYPE_LABELS[type]}</SectionLabel>
                    <ul>
                      {items.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 py-1 text-sm">
                          <span className="flex-1">{m.description}</span>
                          {m.calories !== null ? <span className="text-muted tabular-nums">{m.calories} cal</span> : null}
                          <DeleteFormButton action={deleteMealAction.bind(null, m.id)} label={`Delete ${m.description}`} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          <MealForm date={date} />
        </CardBody>
      </Card>
      <div className="space-y-10">
        <Card>
          <CardHeader title={date === today ? "Water today" : `Water on ${formatDate(date)}`} />
          <CardBody>
            <WaterTracker userId={user.id} date={date} units={user.unitSystem} goalMl={user.waterGoalMl} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Water, last 7 days" />
          <CardBody>
            <ColumnChart
              title={`Water per day in ${unit}, last 7 days`}
              points={waterPoints}
              goal={mlToDisplay(user.waterGoalMl, user.unitSystem)}
              goalLabel="Goal"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Health({ user, today }: { user: CurrentUser; today: ISODate }) {
  const from = addDays(today, -89);
  const metrics = await metricsBetween(user.id, from, today);
  const byDate = new Map(metrics.map((m) => [m.date, m]));
  const units = user.unitSystem;

  const weightPoints = dateRange(from, today).map((d) => {
    const kg = byDate.get(d)?.weightKg;
    const value = kg ? kgToDisplay(kg, units) : null;
    return { label: dayLabel(d), value, display: value === null ? undefined : `${value} ${weightUnit(units)}` };
  });
  const weightValues = weightPoints.map((p) => p.value).filter((v): v is number => v !== null);
  const stepFrom = addDays(today, -13);
  const stepPoints = dateRange(stepFrom, today).map((d) => {
    const steps = byDate.get(d)?.steps ?? null;
    return { label: dayLabel(d), value: steps, display: steps === null ? undefined : `${steps.toLocaleString("en-US")} steps` };
  });
  const sleepPoints = dateRange(stepFrom, today).map((d) => {
    const hours = byDate.get(d)?.sleepHours ?? null;
    return { label: dayLabel(d), value: hours, display: hours === null ? undefined : `${hours} h` };
  });
  const sleepValues = sleepPoints.map((p) => p.value).filter((v): v is number => v !== null);
  const avgSleep = sleepValues.length ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : null;

  return (
    <div className="space-y-10">
      <Card>
        <CardHeader title="Log measurements" />
        <CardBody>
          <MetricsForm today={today} units={units} />
        </CardBody>
      </Card>
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Weight (${weightUnit(units)}), last 90 days`} />
          <CardBody>
            {weightValues.length === 0 ? (
              <EmptyState title="No weight logged yet">Log a measurement above to start the trend.</EmptyState>
            ) : (
              <LineChart
                title={`Weight in ${weightUnit(units)} over the last 90 days`}
                points={weightPoints}
                domain={niceDomain(weightValues, [0, 100])}
                area={false}
                connectGaps
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Steps, last 14 days" />
          <CardBody>
            <ColumnChart title="Steps per day, last 14 days" points={stepPoints} goal={user.stepGoal} goalLabel="Goal" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sleep, last 14 days" description={avgSleep === null ? undefined : `Average ${avgSleep.toFixed(1)} hours a night`} />
          <CardBody>
            <ColumnChart title="Hours of sleep per night, last 14 days" points={sleepPoints} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Habits({ user, today }: { user: CurrentUser; today: ISODate }) {
  const habits = await listHabits(user.id);
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Your habits" description="Tap a day to check it off. Today has the blue outline." />
        <CardBody>
          <HabitGrid userId={user.id} today={today} />
        </CardBody>
      </Card>
      <div className="space-y-10">
        <Card variant="panel">
          <CardHeader title="Build a habit" headingLevel={3} />
          <CardBody>
            <HabitForm />
          </CardBody>
        </Card>
        {habits.length ? (
          <Card>
            <CardHeader title="Manage" headingLevel={3} />
            <CardBody>
              <ul className="divide-y divide-line">
                {habits.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                    <span data-tone={h.color} className="tone-dot size-2.5 rounded-full" aria-hidden />
                    <span className="flex-1">{h.name}</span>
                    <span className="text-xs text-muted">{h.targetPerWeek === 7 ? "Daily" : `${h.targetPerWeek} days a week`}</span>
                    <DeleteHabitButton habitId={h.id} name={h.name} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
