import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PenLine, Search } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { EmptyState, PageBody, PageHeader, PageSkeleton, StatRow } from "@/components/ui/misc";
import { JOURNAL_KIND_LABELS, promptOfTheDay, type JournalKind } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { normalizeTags } from "@/lib/schemas";
import { cn } from "@/lib/cn";
import { currentStreak } from "@/lib/streaks";
import { requireUser } from "@/server/auth/current-user";
import { journalDays, listEntries, listTags } from "@/server/data/journal";
import { userClock } from "@/server/today";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage({ searchParams }: PageProps<"/journal">) {
  return (
    <>
      <PageHeader
        title="Journal"
        actions={
          <ButtonLink href="/journal/new" size="sm">
            <PenLine className="size-4" aria-hidden /> New entry
          </ButtonLink>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <JournalContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const KINDS: JournalKind[] = ["entry", "gratitude", "reflection"];

async function JournalContent({ searchParams }: { searchParams: PageProps<"/journal">["searchParams"] }) {
  const user = await requireUser();
  const { today } = userClock(user);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const kind = KINDS.find((k) => k === params.kind);
  const tag = typeof params.tag === "string" ? normalizeTags(params.tag)[0] : undefined;

  const [entries, tags, days] = await Promise.all([
    listEntries(user.id, { q: q || undefined, kind, tag }),
    listTags(user.id),
    journalDays(user.id),
  ]);
  const filtered = Boolean(q || kind || tag);
  const thisMonth = days.filter((d) => d.slice(0, 7) === today.slice(0, 7)).length;

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return (
    <PageBody className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="space-y-10">
        <Card variant="panel" className="bg-accent-soft">
          <CardHeader title="Today's prompts" description="Pick one to start writing." />
          <CardBody>
            <ul className="divide-y divide-fg/10">
              {KINDS.map((k) => {
                const prompt = promptOfTheDay(today, k);
                return (
                  <li key={k}>
                    <Link
                      href={`/journal/new?kind=${k}&prompt=${encodeURIComponent(prompt)}`}
                      className="group grid gap-0.5 py-3 sm:grid-cols-[6.5rem_1fr] sm:gap-4"
                      aria-label={`Write about: ${prompt}`}
                    >
                      <span className="text-sm text-muted">{JOURNAL_KIND_LABELS[k]}</span>
                      <span className="font-medium group-hover:underline">{prompt}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-8">
          <form role="search" action="/journal" className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <Label htmlFor="journal-q">Search entries</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                <Input id="journal-q" name="q" defaultValue={q} placeholder="Words in a title or entry" className="pl-9" />
              </div>
            </div>
            <div>
              <Label htmlFor="journal-kind-filter">Type</Label>
              <Select id="journal-kind-filter" name="kind" defaultValue={kind ?? ""}>
                <option value="">All types</option>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{JOURNAL_KIND_LABELS[k]}</option>
                ))}
              </Select>
            </div>
            {tag ? <input type="hidden" name="tag" value={tag} /> : null}
            <button type="submit" className={buttonClasses({ variant: "secondary" })}>
              Search
            </button>
            {filtered ? (
              <Link href="/journal" className={buttonClasses({ variant: "ghost" })}>
                Clear
              </Link>
            ) : null}
          </form>
          {tag ? <p className="-mt-4 text-sm text-muted">Showing entries tagged #{tag}</p> : null}

          {entries.length === 0 ? (
            <EmptyState
              title={filtered ? "No entries match" : "Your journal is empty"}
              action={!filtered ? <ButtonLink href="/journal/new">Write your first entry</ButtonLink> : undefined}
            >
              {filtered ? "Try different words or clear the filters." : "Start with one of today's prompts, or write freely."}
            </EmptyState>
          ) : (
            [...groups].map(([month, monthEntries]) => (
              <section key={month} aria-labelledby={`month-${month}`}>
                <h2 id={`month-${month}`} className="mb-2 text-section font-semibold">
                  {formatDate(`${month}-01`, { month: "long", year: "numeric" })}
                </h2>
                <ul className="divide-y divide-line">
                  {monthEntries.map((entry) => (
                    <li key={entry.id}>
                      <Link href={`/journal/${entry.id}`} className="group grid gap-x-4 py-3 sm:grid-cols-[5.5rem_1fr]">
                        <span className="text-sm text-muted tabular-nums">
                          <time dateTime={entry.date}>{formatDate(entry.date, { weekday: "short", day: "numeric" })}</time>
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium group-hover:text-primary-ink group-hover:underline">{entry.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{entry.body}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 text-meta text-subtle">
                            {entry.kind !== "entry" ? <span>{JOURNAL_KIND_LABELS[entry.kind]}</span> : null}
                            {entry.tags.map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>

      <aside aria-label="Journal summary" className="space-y-6 rounded-2xl bg-surface-2 p-5">
        <dl>
          <StatRow label="Days in a row" value={currentStreak(days, today)} emphasis={currentStreak(days, today) > 0 ? "accent" : undefined} />
          <StatRow label="Days written this month" value={thisMonth} />
        </dl>
        <div>
          <h2 className="mb-2 text-panel font-semibold">Tags</h2>
          {tags.length === 0 ? (
            <p className="text-sm text-muted">Add tags to entries to group them.</p>
          ) : (
            <ul className="space-y-0.5">
              {tags.map((t) => (
                <li key={t.tag}>
                  <Link
                    href={t.tag === tag ? "/journal" : `/journal?tag=${encodeURIComponent(t.tag)}`}
                    aria-current={t.tag === tag ? "true" : undefined}
                    className={cn(
                      "-mx-2 flex items-center justify-between rounded-lg px-2 py-1 text-sm transition-colors",
                      t.tag === tag ? "bg-primary-soft font-semibold" : "hover:bg-surface-3",
                    )}
                  >
                    #{t.tag}
                    <span className="text-xs text-muted tabular-nums">{t.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </PageBody>
  );
}
