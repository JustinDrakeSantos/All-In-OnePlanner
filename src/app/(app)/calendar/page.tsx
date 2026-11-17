import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { PageBody, PageHeader, Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import {
  addDays,
  addMonths,
  formatDate,
  isISODate,
  monthGrid,
  weekDays,
  type ISODate,
} from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { listEventsBetween } from "@/server/data/events";
import { tasksDueBetween } from "@/server/data/tasks";
import { userClock } from "@/server/today";
import { toCalendarTask, toEventData, type CalendarViewName } from "./calendar-data";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "Calendar" };

const VIEWS: { key: CalendarViewName; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader title="Calendar" />
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function titleFor(view: CalendarViewName, anchor: ISODate, days: ISODate[]): string {
  if (view === "month") return formatDate(anchor, { month: "long", year: "numeric" });
  if (view === "day") return formatDate(anchor, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  // "November 15 – 21, 2026" or "Nov 29 – Dec 5, 2026"
  return sameMonth
    ? `${formatDate(first, { month: "long", day: "numeric" })} – ${Number(last.slice(8))}, ${last.slice(0, 4)}`
    : `${formatDate(first, { month: "short", day: "numeric" })} – ${formatDate(last, { month: "short", day: "numeric", year: "numeric" })}`;
}

async function CalendarContent({ searchParams }: { searchParams: PageProps<"/calendar">["searchParams"] }) {
  const user = await requireUser();
  const { today, nowMinute } = userClock(user);
  const params = await searchParams;
  const view: CalendarViewName = VIEWS.some((v) => v.key === params.view) ? (params.view as CalendarViewName) : "month";
  const anchor = isISODate(params.date) ? params.date : today;

  const days = view === "month" ? monthGrid(anchor) : view === "week" ? weekDays(anchor) : [anchor];
  const from = days[0];
  const to = days[days.length - 1];
  const [events, tasks] = await Promise.all([listEventsBetween(user.id, from, to), tasksDueBetween(user.id, from, to)]);

  const step = (direction: 1 | -1) =>
    view === "month" ? addMonths(anchor, direction) : addDays(anchor, view === "week" ? 7 * direction : direction);
  const href = (date: ISODate, v: CalendarViewName = view) => `/calendar?view=${v}&date=${date}`;

  return (
    <PageBody className="max-w-7xl">
      <CalendarView
        view={view}
        days={days}
        anchor={anchor}
        today={today}
        timeZone={user.timezone}
        initialNowMinute={nowMinute}
        events={events.map(toEventData)}
        tasks={tasks.map(toCalendarTask)}
        navigation={
        <div className="flex items-center gap-2">
          <Link href={href(today)} className={buttonClasses({ variant: "outline", size: "sm" })}>
            Today
          </Link>
          <div className="flex">
            <Link href={href(step(-1))} className={buttonClasses({ variant: "ghost", size: "icon" })} aria-label={`Previous ${view}`}>
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
            <Link href={href(step(1))} className={buttonClasses({ variant: "ghost", size: "icon" })} aria-label={`Next ${view}`}>
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </div>
          <h2 className="ml-1 text-lg font-semibold tabular-nums sm:text-xl" aria-live="polite">
            {titleFor(view, anchor, days)}
          </h2>
        </div>
        }
        viewSwitcher={
        <nav aria-label="Calendar view" className="flex rounded-xl bg-surface-2 p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={href(anchor, v.key)}
              aria-current={view === v.key ? "page" : undefined}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                view === v.key ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
        }
      />
    </PageBody>
  );
}

function CalendarSkeleton() {
  return (
    <PageBody className="max-w-7xl">
      <p className="sr-only" role="status">Loading calendar…</p>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-none sm:h-28" />
        ))}
      </div>
    </PageBody>
  );
}
