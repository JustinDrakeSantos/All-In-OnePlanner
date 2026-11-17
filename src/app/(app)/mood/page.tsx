import type { Metadata } from "next";
import Link from "next/link";
import { TextLink } from "@/components/ui/text-link";
import { Suspense } from "react";
import { BarList, ColumnChart, LineChart } from "@/components/charts";
import { MoodIcon } from "@/components/mood-icon";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DeleteFormButton } from "@/components/ui/delete-form-button";
import { Input, Label } from "@/components/ui/field";
import { EmptyState, PageBody, PageHeader, PageSkeleton, StatRow } from "@/components/ui/misc";
import { MOOD_SCALE, SELF_CARE_IDEAS, moodLabel } from "@/lib/constants";
import { addDays, dateRange, daysBetween, formatDate, formatLongDate, isISODate } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { moodOn, moodsBetween, recentMoods, summarizeMoods } from "@/server/data/mood";
import { userClock } from "@/server/today";
import { deleteMoodAction } from "./actions";
import { MoodCheckInForm, MoodReminderForm } from "./mood-forms";

export const metadata: Metadata = { title: "Mood" };

export default function MoodPage({ searchParams }: PageProps<"/mood">) {
  return (
    <>
      <PageHeader title="Mood" />
      <Suspense fallback={<PageSkeleton layout="grid" />}>
        <MoodContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtMood = (v: number) => (Number.isInteger(v) ? moodLabel(v) : v.toFixed(1));

async function MoodContent({ searchParams }: { searchParams: PageProps<"/mood">["searchParams"] }) {
  const user = await requireUser();
  const { today } = userClock(user);
  const params = await searchParams;
  const date = isISODate(params.date) && params.date <= today ? params.date : today;

  const from30 = addDays(today, -29);
  const [existing, last30, last90, history] = await Promise.all([
    moodOn(user.id, date),
    moodsBetween(user.id, from30, today),
    moodsBetween(user.id, addDays(today, -89), today),
    recentMoods(user.id, 10),
  ]);
  const byDate = new Map(last30.map((m) => [m.date, m]));
  const points = dateRange(from30, today).map((d) => {
    const entry = byDate.get(d);
    return {
      label: formatDate(d, { month: "short", day: "numeric" }),
      value: entry?.mood ?? null,
      display: entry ? `${moodLabel(entry.mood)} (${entry.mood})` : undefined,
    };
  });

  const summary = summarizeMoods(last90);
  const thisWeek = last30.filter((m) => daysBetween(m.date, today) < 7);
  const lastWeek = last30.filter((m) => daysBetween(m.date, today) >= 7 && daysBetween(m.date, today) < 14);
  const avg = (list: typeof last30) => (list.length ? list.reduce((s, m) => s + m.mood, 0) / list.length : null);
  const avgThis = avg(thisWeek);
  const avgLast = avg(lastWeek);

  const todayMood = date === today ? existing : await moodOn(user.id, today);
  const needsCare = todayMood !== null && todayMood.mood <= 2;
  const ideaStart = Math.abs(daysBetween("2000-01-01", today)) % SELF_CARE_IDEAS.length;
  const ideas = [0, 1, 2].map((i) => SELF_CARE_IDEAS[(ideaStart + i) % SELF_CARE_IDEAS.length]);

  return (
    <PageBody className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-10">
        <Card>
          <CardHeader
            title={date === today ? "Today's check-in" : "Check-in"}
            description={formatLongDate(date)}
            action={
              <form action="/mood" className="flex items-center gap-1.5">
                <Label htmlFor="mood-date" className="sr-only">Pick a day</Label>
                <Input id="mood-date" type="date" name="date" max={today} defaultValue={date} className="h-8 w-auto text-xs" />
                <button type="submit" className={buttonClasses({ variant: "outline", size: "sm" })}>Show</button>
              </form>
            }
          />
          <CardBody>
            <MoodCheckInForm
              date={date}
              existing={existing ? { mood: existing.mood, energy: existing.energy, emotions: existing.emotions, note: existing.note } : null}
            />
          </CardBody>
        </Card>

        {needsCare ? (
          <Card variant="panel" className="bg-accent-soft">
            <CardHeader title="Be gentle with yourself today" headingLevel={3} />
            <CardBody>
              <p className="text-sm">Rough days happen. A few small things that might help:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm marker:text-muted">
                {ideas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
              <TextLink href={`/journal/new?date=${today}&kind=reflection`} className="mt-3 inline-block text-sm">
                Write it out in your journal
              </TextLink>
              <p className="mt-3 text-xs text-muted">
                If you&apos;re struggling or feel unsafe, reach out to someone you trust or a local crisis line. In the US, call or text 988.
              </p>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Daily reminder" />
          <CardBody>
            <MoodReminderForm time={user.moodReminderTime} />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-10">
        <Card>
          <CardHeader title="Last 30 days" description="Gaps are days without a check-in." />
          <CardBody>
            {last30.length === 0 ? (
              <EmptyState title="No check-ins yet">Your trend appears after the first one.</EmptyState>
            ) : (
              <>
                <LineChart
                  title="Mood over the last 30 days, from 1 (awful) to 5 (great)"
                  points={points}
                  domain={[1, 5]}
                  ticks={MOOD_SCALE.map((m) => ({ value: m.value, label: m.label }))}
                  height={210}
                />
                <dl className="mt-4 rounded-xl bg-surface-2 px-4 py-2">
                  <StatRow label="Average, last 7 days" value={avgThis === null ? "No check-ins" : `${avgThis.toFixed(1)} of 5`} />
                  <StatRow label="Average, the 7 days before" value={avgLast === null ? "No check-ins" : `${avgLast.toFixed(1)} of 5`} />
                  <StatRow label="Check-ins in 30 days" value={last30.length} />
                </dl>
              </>
            )}
          </CardBody>
        </Card>

        {summary ? (
          <Card>
            <CardHeader title="Patterns" description="From the last 90 days." />
            <CardBody className="space-y-8">
              <div>
                <h3 className="mb-2 text-sm font-medium">Average mood by weekday</h3>
                <ColumnChart
                  title="Average mood by weekday"
                  points={summary.byWeekday.map((v, i) => ({
                    label: WEEKDAY_LABELS[i],
                    value: v === null ? null : Number(v.toFixed(1)),
                    display: v === null ? undefined : fmtMood(Number(v.toFixed(1))),
                  }))}
                  highlightLast={false}
                  height={180}
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium">Most frequent emotions</h3>
                {summary.topEmotions.length ? (
                  <BarList
                    title="Most frequent emotions"
                    items={summary.topEmotions.map((e) => ({ label: e.emotion, value: e.count, display: `${e.count} times` }))}
                  />
                ) : (
                  <p className="text-sm text-muted">Pick emotions in your check-ins to see them here.</p>
                )}
              </div>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Recent check-ins" />
          <CardBody>
            {history.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {history.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 py-2.5">
                    <MoodIcon value={m.mood} className="mt-0.5 size-5 shrink-0 text-chart-1" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p>
                        <Link href={`/mood?date=${m.date}`} className="font-medium hover:text-primary-ink hover:underline">
                          {formatDate(m.date, { weekday: "short", month: "short", day: "numeric" })}
                        </Link>
                        <span className="ml-2 text-muted">{moodLabel(m.mood)}</span>
                      </p>
                      {m.emotions.length ? <p className="text-muted capitalize">{m.emotions.join(", ")}</p> : null}
                      {m.note ? <p className="mt-0.5">{m.note}</p> : null}
                      <TextLink href={`/journal/new?date=${m.date}`} className="text-meta">
                        Write about this day
                      </TextLink>
                    </div>
                    <DeleteFormButton action={deleteMoodAction.bind(null, m.id)} label={`Delete check-in for ${formatDate(m.date)}`} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageBody>
  );
}
