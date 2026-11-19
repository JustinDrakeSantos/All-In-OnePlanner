import type { Metadata } from "next";
import Link from "next/link";
import { TextLink } from "@/components/ui/text-link";
import { Suspense } from "react";
import { MoodIcon } from "@/components/mood-icon";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CheckinsFrame, glassPanelClasses, PageBody, PageHeader, PageSkeleton, ProgressBar, StatRow } from "@/components/ui/misc";
import { JOURNAL_KIND_LABELS, moodLabel, promptOfTheDay } from "@/lib/constants";
import { addDays, dateRange, formatDate, formatLongDate, greetingFor, relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth/current-user";
import { listEventsBetween, upcomingEvents } from "@/server/data/events";
import { metricsBetween, workoutsBetween } from "@/server/data/fitness";
import { listEntries } from "@/server/data/journal";
import { moodsBetween } from "@/server/data/mood";
import { listTaskLists, taskStats, tasksDueBy } from "@/server/data/tasks";
import { userClock } from "@/server/today";
import { AgendaList } from "../calendar/agenda-list";
import { toEventData } from "../calendar/calendar-data";
import { NewEventButton } from "../calendar/event-dialog";
import { HabitGrid, WaterTracker } from "../fitness/widgets";
import { QuickAddTask, TaskRow } from "../tasks/task-components";
import { toListOption, toTaskRow } from "../tasks/task-data";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Dashboard" />
          <PageSkeleton layout="dashboard" />
        </>
      }
    >
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const { today, nowMinute } = userClock(user);
  const weekAgo = addDays(today, -6);

  const [todaysEvents, nextEvents, dueTasks, stats, lists, moods, entries, metrics, workouts] = await Promise.all([
    listEventsBetween(user.id, today, today),
    upcomingEvents(user.id, addDays(today, 1), 0, 4),
    tasksDueBy(user.id, today),
    taskStats(user.id, today),
    listTaskLists(user.id),
    moodsBetween(user.id, weekAgo, today),
    listEntries(user.id, { limit: 3 }),
    metricsBetween(user.id, today, today),
    workoutsBetween(user.id, weekAgo, today),
  ]);
  const listOptions = lists.map(toListOption);
  const moodByDate = new Map(moods.map((m) => [m.date, m]));
  const todaysMood = moodByDate.get(today);
  const steps = metrics[0]?.steps ?? null;
  const doneWorkouts = workouts.filter((w) => w.completed);
  const activeMinutes = doneWorkouts.reduce((sum, w) => sum + w.durationMin, 0);
  const remainingEvents = todaysEvents.filter((e) => e.allDay || e.endMinute > nowMinute);
  const prompt = promptOfTheDay(today);

  return (
    <>
      <PageHeader
        title={`${greetingFor(nowMinute)}, ${user.name.split(/\s+/)[0]}`}
        description={formatLongDate(today)}
        actions={
          <>
            <NewEventButton date={today} startMinute={Math.min(23 * 60, Math.ceil((nowMinute + 1) / 60) * 60)} variant="outline" />
            <ButtonLink href="/planner" size="sm">
              Plan your day
            </ButtonLink>
          </>
        }
      />
      <PageBody className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* The main feature: today's schedule and tasks. */}
        <div className="space-y-10">
          <Card>
            <CardHeader
              title="Schedule"
              description={todaysEvents.length ? `${remainingEvents.length} of ${todaysEvents.length} events still ahead` : undefined}
              action={<TextLink href={`/calendar?view=day&date=${today}`}>Open calendar</TextLink>}
            />
            <CardBody>
              <AgendaList
                events={remainingEvents.map(toEventData)}
                today={today}
                now={{ today, minute: nowMinute }}
                empty={<p className="text-sm text-muted">{todaysEvents.length ? "That's everything on the calendar for today." : "Nothing on the calendar today."}</p>}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Due today"
              description={stats.overdue ? `Includes ${stats.overdue} overdue` : undefined}
              action={<TextLink href="/tasks">All tasks</TextLink>}
            />
            <CardBody>
              <QuickAddTask lists={listOptions} defaultDueDate={today} />
              {dueTasks.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nothing due today.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {dueTasks.slice(0, 8).map((t) => <TaskRow key={t.id} task={toTaskRow(t)} today={today} lists={listOptions} compact />)}
                </ul>
              )}
              {dueTasks.length > 8 ? (
                <TextLink href="/tasks?view=today" className="mt-2 inline-block text-sm">
                  Show {dueTasks.length - 8} more
                </TextLink>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Coming up" />
            <CardBody>
              <AgendaList events={nextEvents.map(toEventData)} today={today} showDate empty={<p className="text-sm text-muted">Nothing scheduled after today.</p>} />
            </CardBody>
          </Card>
        </div>

        {/* Side summary: one frosted-glass panel over a soft wash, each part only as tall as its content. */}
        <CheckinsFrame>
          <aside aria-label="Today's check-ins" className={glassPanelClasses}>
            <section className="py-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-panel font-semibold">Mood</h2>
                <TextLink href="/mood" className="text-sm">
                  {todaysMood ? "Edit" : "Check in"}
                </TextLink>
              </div>
              {todaysMood ? (
                <p className="mb-3 flex items-center gap-2.5">
                  <MoodIcon value={todaysMood.mood} className="size-7 text-chart-1" />
                  <span>
                    <span className="block text-sm font-medium">Feeling {moodLabel(todaysMood.mood).toLowerCase()}</span>
                    {todaysMood.emotions.length ? <span className="block text-xs text-muted capitalize">{todaysMood.emotions.slice(0, 3).join(", ")}</span> : null}
                  </span>
                </p>
              ) : (
                <p className="mb-3 text-sm text-muted">No check-in yet today.</p>
              )}
              <ol className="grid grid-cols-7 gap-1 text-center" aria-label="Mood, last 7 days">
                {dateRange(weekAgo, today).map((d) => {
                  const m = moodByDate.get(d);
                  return (
                    <li key={d} className={cn("rounded-md py-1", d === today && "bg-surface")}>
                      {m ? <MoodIcon value={m.mood} className="mx-auto size-[18px] text-chart-1" /> : <span className="mx-auto block size-[18px] text-subtle" aria-hidden>·</span>}
                      <span className="block text-micro text-muted">{formatDate(d, { weekday: "narrow" })}</span>
                      <span className="sr-only">{formatDate(d, { weekday: "long" })}: {m ? moodLabel(m.mood) : "no check-in"}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
  
            <section className="py-5">
              <h2 className="mb-3 text-panel font-semibold">Habits</h2>
              <HabitGrid userId={user.id} today={today} compact />
            </section>
  
            <section className="py-5">
              <h2 className="mb-3 text-panel font-semibold">Water</h2>
              <WaterTracker userId={user.id} date={today} units={user.unitSystem} goalMl={user.waterGoalMl} showCustom={false} />
            </section>
  
            <section className="py-5">
              <h2 className="mb-2 text-panel font-semibold">This week</h2>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-muted">Tasks done of due</span>
                <span className="font-semibold tabular-nums">{stats.doneOfDueThisWeek} / {stats.dueThisWeek}</span>
              </div>
              <ProgressBar value={stats.doneOfDueThisWeek} max={Math.max(stats.dueThisWeek, 1)} label="Tasks due this week that are done" />
              <dl className="mt-2">
                <StatRow label="Task streak" value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`} emphasis={stats.currentStreak > 0 ? "accent" : undefined} />
                <StatRow label="Workouts" value={doneWorkouts.length} />
                <StatRow label="Active minutes" value={activeMinutes} />
                <StatRow label="Steps today" value={steps === null ? "None logged" : steps.toLocaleString("en-US")} />
              </dl>
            </section>
  
            <section className="py-5">
              <h2 className="mb-2 text-panel font-semibold">Journal</h2>
              <Link href={`/journal/new?kind=entry&prompt=${encodeURIComponent(prompt)}`} className="block rounded-xl bg-accent-soft px-4 py-3 transition-colors hover:bg-accent/40">
                <span className="block text-xs text-muted">Today&apos;s prompt</span>
                <span className="mt-0.5 block text-panel leading-snug font-medium">{prompt}</span>
              </Link>
              {entries.length ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {entries.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-3">
                      <Link href={`/journal/${e.id}`} className="min-w-0 flex-1 truncate hover:text-primary-ink hover:underline">{e.title}</Link>
                      <span className="shrink-0 text-xs text-muted">{relativeDayLabel(e.date, today)}</span>
                      <span className="sr-only">{JOURNAL_KIND_LABELS[e.kind]}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </aside>
        </CheckinsFrame>
      </PageBody>
    </>
  );
}
