import type { Metadata } from "next";
import Link from "next/link";
import { TextLink } from "@/components/ui/text-link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MoodIcon } from "@/components/mood-icon";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { EmptyState, PageBody, PageHeader, PageSkeleton, SectionLabel } from "@/components/ui/misc";
import { moodLabel } from "@/lib/constants";
import { addDays, formatLongDate, greetingFor, isISODate, relativeDayLabel } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { listEventsBetween } from "@/server/data/events";
import { entriesOn } from "@/server/data/journal";
import { moodOn } from "@/server/data/mood";
import {
  highPriorityOpenTasks,
  listTaskLists,
  openTasksAfter,
  tasksDueBy,
  tasksDueOn,
  undatedOpenTasks,
} from "@/server/data/tasks";
import { userClock } from "@/server/today";
import { AgendaList } from "../calendar/agenda-list";
import { toEventData } from "../calendar/calendar-data";
import { NewEventButton } from "../calendar/event-dialog";
import { HabitGrid } from "../fitness/widgets";
import { QuickAddTask, TaskRow } from "../tasks/task-components";
import { toListOption, toTaskRow, type ListOption } from "../tasks/task-data";

export const metadata: Metadata = { title: "Daily Planner" };

export default function PlannerPage({ searchParams }: PageProps<"/planner">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Daily Planner" />
          <PageSkeleton />
        </>
      }
    >
      <Planner searchParams={searchParams} />
    </Suspense>
  );
}

async function Planner({ searchParams }: { searchParams: PageProps<"/planner">["searchParams"] }) {
  const user = await requireUser();
  const { today, nowMinute } = userClock(user);
  const params = await searchParams;
  const date = isISODate(params.date) ? params.date : today;
  const isToday = date === today;

  const [due, overdue, events, upcomingEvents, future, someday, important, lists, mood, entries] = await Promise.all([
    tasksDueOn(user.id, date),
    isToday ? tasksDueBy(user.id, addDays(today, -1)) : Promise.resolve([]),
    listEventsBetween(user.id, date, date),
    listEventsBetween(user.id, addDays(date, 1), addDays(date, 7)),
    openTasksAfter(user.id, date, addDays(date, 14), 10),
    undatedOpenTasks(user.id, 6),
    highPriorityOpenTasks(user.id, 6),
    listTaskLists(user.id),
    moodOn(user.id, date),
    entriesOn(user.id, date),
  ]);
  const listOptions: ListOption[] = lists.map(toListOption);
  const firstName = user.name.split(/\s+/)[0];
  const planHref = (d: string) => `/planner?date=${d}`;

  return (
    <>
      <PageHeader
        title={isToday ? `${greetingFor(nowMinute)}, ${firstName}` : relativeDayLabel(date, today)}
        description={formatLongDate(date)}
        actions={
          <>
            <div className="flex">
              <Link href={planHref(addDays(date, -1))} className={buttonClasses({ variant: "ghost", size: "icon" })} aria-label="Previous day" title="Previous day">
                <ChevronLeft className="size-5" aria-hidden />
              </Link>
              <Link href={planHref(addDays(date, 1))} className={buttonClasses({ variant: "ghost", size: "icon" })} aria-label="Next day" title="Next day">
                <ChevronRight className="size-5" aria-hidden />
              </Link>
            </div>
            {!isToday ? (
              <Link href={planHref(today)} className={buttonClasses({ variant: "outline", size: "sm" })}>
                Today
              </Link>
            ) : null}
            <form action="/planner" className="flex items-center gap-1.5">
              <Label htmlFor="planner-date" className="sr-only">Go to date</Label>
              <Input id="planner-date" type="date" name="date" defaultValue={date} className="h-9 w-auto" />
              <button type="submit" className={buttonClasses({ variant: "outline", size: "sm" })}>Go</button>
            </form>
          </>
        }
      />
      <PageBody className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-10">
          <Card>
            <CardHeader
              title={isToday ? "Today's plan" : "Plan for the day"}
              description={isToday && overdue.length ? `${overdue.length} carried over from earlier days` : undefined}
            />
            <CardBody className="space-y-4">
              <QuickAddTask lists={listOptions} defaultDueDate={date} placeholder={isToday ? "What else needs doing today?" : "Add a task for this day…"} />
              {overdue.length === 0 && due.length === 0 ? (
                <EmptyState title="Nothing planned yet">Add a task above to plan this day.</EmptyState>
              ) : (
                <>
                  {overdue.length ? (
                    <section aria-label="Carried over">
                      <SectionLabel className="text-danger">Carried over</SectionLabel>
                      <ul className="divide-y divide-line">
                        {overdue.map((t) => <TaskRow key={t.id} task={toTaskRow(t)} today={today} lists={listOptions} />)}
                      </ul>
                    </section>
                  ) : null}
                  {due.length ? (
                    <section aria-label="Due this day">
                      {overdue.length ? <SectionLabel>Due {isToday ? "today" : "this day"}</SectionLabel> : null}
                      <ul className="divide-y divide-line">
                        {due.map((t) => <TaskRow key={t.id} task={toTaskRow(t)} today={today} lists={listOptions} />)}
                      </ul>
                    </section>
                  ) : null}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Schedule"
              action={<NewEventButton date={date} startMinute={isToday ? Math.min(23 * 60, Math.ceil((nowMinute + 1) / 60) * 60) : 9 * 60} label="Add" variant="outline" />}
            />
            <CardBody>
              <AgendaList events={events.map(toEventData)} today={today} now={isToday ? { today, minute: nowMinute } : undefined} empty={<p className="text-sm text-muted">No events. A free day.</p>} />
              <TextLink href={`/calendar?view=day&date=${date}`} className="mt-3 inline-block text-sm">
                Open in calendar
              </TextLink>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Coming up" description="Due in the next two weeks, then anything without a date." />
            <CardBody>
              {future.length === 0 && someday.length === 0 ? (
                <p className="text-sm text-muted">Nothing coming up.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {[...future, ...someday].map((t) => (
                    <TaskRow key={t.id} task={toTaskRow(t)} today={today} lists={listOptions} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <aside aria-label="At a glance" className="glass-panel divide-y divide-glass-divider rounded-2xl px-5">
          <section className="py-5">
            <h2 className="mb-1 text-panel font-semibold">Important</h2>
            {important.length === 0 ? (
              <p className="text-sm text-muted">No high-priority tasks open.</p>
            ) : (
              <ul className="divide-y divide-line">
                {important.map((t) => <TaskRow key={t.id} task={toTaskRow(t)} today={today} lists={listOptions} compact />)}
              </ul>
            )}
          </section>
          <section className="py-5">
            <h2 className="mb-3 text-panel font-semibold">Next 7 days</h2>
            <AgendaList events={upcomingEvents.map(toEventData)} today={today} showDate empty={<p className="text-sm text-muted">Nothing scheduled.</p>} />
          </section>
          {isToday ? (
            <section className="py-5">
              <h2 className="mb-3 text-panel font-semibold">Habits</h2>
              <HabitGrid userId={user.id} today={today} compact />
            </section>
          ) : null}
          <section className="space-y-3 py-5 text-sm">
            <h2 className="text-panel font-semibold">Reflect</h2>
            <div className="flex items-center gap-2.5">
              {mood ? (
                <>
                  <MoodIcon value={mood.mood} className="size-5 text-chart-1" />
                  <span className="flex-1">Feeling {moodLabel(mood.mood).toLowerCase()}</span>
                </>
              ) : (
                <span className="flex-1 text-muted">No mood check-in.</span>
              )}
              {date <= today ? (
                <TextLink href={`/mood?date=${date}`}>
                  {mood ? "Edit" : "Check in"}
                </TextLink>
              ) : null}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex-1 text-muted">
                {entries.length ? `${entries.length} journal ${entries.length === 1 ? "entry" : "entries"}` : "No journal entry yet."}
              </span>
              <TextLink href={entries.length === 1 ? `/journal/${entries[0].id}` : `/journal/new?date=${date}`}>
                {entries.length === 1 ? "Read" : "Write"}
              </TextLink>
            </div>
          </section>
        </aside>
      </PageBody>
    </>
  );
}
