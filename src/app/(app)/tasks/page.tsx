import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageBody, PageHeader, PageSkeleton, ProgressBar, SectionLabel, StatRow } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth/current-user";
import { listTaskLists, listTasks, taskStats, type TaskView, type TaskWithList } from "@/server/data/tasks";
import { userClock } from "@/server/today";
import { DeleteListButton, NewListForm, QuickAddTask, TaskRow } from "./task-components";
import { toListOption, toTaskRow, type ListOption } from "./task-data";

export const metadata: Metadata = { title: "Tasks" };

const VIEWS: { key: Exclude<TaskView, "list">; label: string; countKey: "all" | "today" | "upcoming" | "someday" | "completed" }[] = [
  { key: "today", label: "Today", countKey: "today" },
  { key: "upcoming", label: "Upcoming", countKey: "upcoming" },
  { key: "someday", label: "No date", countKey: "someday" },
  { key: "all", label: "All open", countKey: "all" },
  { key: "completed", label: "Completed", countKey: "completed" },
];

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <>
      <PageHeader title="Tasks" />
      <Suspense fallback={<PageSkeleton />}>
        <TasksContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TasksContent({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const user = await requireUser();
  const { today } = userClock(user);
  const params = await searchParams;
  const lists = await listTaskLists(user.id);
  const listId = typeof params.list === "string" && lists.some((l) => l.id === params.list) ? params.list : undefined;
  const requested = typeof params.view === "string" ? params.view : "today";
  const view: TaskView = listId ? "list" : VIEWS.some((v) => v.key === requested) ? (requested as TaskView) : "today";

  const [tasks, stats] = await Promise.all([listTasks(user.id, view, today, listId), taskStats(user.id, today)]);
  const listOptions: ListOption[] = lists.map(toListOption);
  const activeList = lists.find((l) => l.id === listId);
  const heading = activeList?.name ?? VIEWS.find((v) => v.key === view)?.label ?? "Tasks";

  return (
    // Source order is the phone order (views, tasks, lists, summary). On wide screens the
    // views and lists share the left column and the tasks and summary span both rows.
    <PageBody className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[12rem_minmax(0,1fr)_16rem] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6">
      <nav aria-label="Task views" className="min-w-0 lg:col-start-1 lg:row-start-1">
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {VIEWS.map((v) => (
            <li key={v.key}>
              <SideLink href={`/tasks?view=${v.key}`} active={view === v.key} count={stats[v.countKey]}>
                {v.label}
              </SideLink>
            </li>
          ))}
        </ul>
      </nav>

      <Card className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <CardHeader title={heading} description={view === "today" ? "Due today, plus anything overdue." : undefined} />
        <CardBody>
          {view !== "completed" ? (
            <div className="mb-2">
              <QuickAddTask
                lists={listOptions}
                defaultDueDate={view === "today" ? today : undefined}
                defaultListId={listId}
                placeholder={activeList ? `Add to ${activeList.name}…` : "Add a task…"}
              />
            </div>
          ) : null}
          <TaskGroups tasks={tasks} view={view} today={today} lists={listOptions} />
        </CardBody>
      </Card>

      <section aria-labelledby="task-lists-heading" className="lg:col-start-1 lg:row-start-2">
          <h2 id="task-lists-heading" className="mb-1 px-3 text-meta font-semibold text-muted">Lists</h2>
          <ul>
            {lists.map((list) => (
              <li key={list.id} className="group flex items-center">
                <SideLink href={`/tasks?list=${list.id}`} active={listId === list.id} count={Number(list.openCount)} className="flex-1">
                  <span data-tone={list.color} className="tone-dot size-2 shrink-0 rounded-full" aria-hidden />
                  {list.name}
                </SideLink>
                <DeleteListButton listId={list.id} name={list.name} />
              </li>
            ))}
          </ul>
          <div className="mt-4 px-1">
            <NewListForm />
          </div>
      </section>

      <aside aria-label="Progress" className="space-y-6 lg:col-start-3 lg:row-span-2 lg:row-start-1">
        <Card variant="panel">
          <CardHeader title="This week" headingLevel={3} />
          <CardBody>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-muted">Done of due</span>
              <span className="font-semibold tabular-nums">
                {stats.doneOfDueThisWeek} / {stats.dueThisWeek}
              </span>
            </div>
            <ProgressBar value={stats.doneOfDueThisWeek} max={Math.max(stats.dueThisWeek, 1)} label="Tasks due this week that are done" />
            <dl className="mt-3">
              <StatRow label="Completed" value={stats.completedThisWeek} />
              <StatRow label="Overdue" value={stats.overdue} emphasis={stats.overdue > 0 ? "danger" : undefined} />
              <StatRow label="Current streak" value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`} emphasis={stats.currentStreak > 0 ? "accent" : undefined} />
              <StatRow label="Best streak" value={`${stats.longestStreak} ${stats.longestStreak === 1 ? "day" : "days"}`} />
            </dl>
            <p className="mt-2 text-xs text-muted">A streak counts days in a row with at least one task done.</p>
          </CardBody>
        </Card>
      </aside>
    </PageBody>
  );
}

function TaskGroups({
  tasks,
  view,
  today,
  lists,
}: {
  tasks: TaskWithList[];
  view: TaskView;
  today: string;
  lists: ListOption[];
}) {
  if (tasks.length === 0) {
    const messages: Record<TaskView, [string, string]> = {
      today: ["Nothing due today", "Add something above, or enjoy the breathing room."],
      upcoming: ["No upcoming tasks", "Tasks with a future due date show up here."],
      someday: ["No undated tasks", "Tasks without a due date show up here."],
      all: ["You're all caught up", "Every task is done."],
      completed: ["Nothing completed yet", "Checked-off tasks show up here."],
      list: ["This list is empty", "Add the first task above."],
    };
    const [title, body] = messages[view];
    return (
      <EmptyState className="mt-3" title={title}>
        {body}
      </EmptyState>
    );
  }

  const groups =
    view === "today"
      ? [
          { label: "Overdue", items: tasks.filter((t) => t.dueDate !== null && t.dueDate < today) },
          { label: "Today", items: tasks.filter((t) => t.dueDate === today) },
        ]
      : view === "all" || view === "list"
        ? [
            { label: "Overdue", items: tasks.filter((t) => t.dueDate !== null && t.dueDate < today) },
            { label: "Today", items: tasks.filter((t) => t.dueDate === today) },
            { label: "Upcoming", items: tasks.filter((t) => t.dueDate !== null && t.dueDate > today) },
            { label: "No date", items: tasks.filter((t) => t.dueDate === null) },
          ]
        : [{ label: "", items: tasks }];
  const visible = groups.filter((g) => g.items.length > 0);

  return (
    <div className="mt-2 space-y-5">
      {visible.map((group) => (
        <section key={group.label || "all"} aria-label={group.label || undefined}>
          {group.label && visible.length > 1 ? (
            <SectionLabel className={group.label === "Overdue" ? "text-danger" : undefined}>
              {group.label} <span className="tabular-nums">{group.items.length}</span>
            </SectionLabel>
          ) : null}
          <ul className="divide-y divide-line">
            {group.items.map((task) => (
              <TaskRow key={task.id} task={toTaskRow(task)} today={today} lists={lists} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SideLink({
  href,
  active,
  count,
  className,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
        active ? "bg-primary-soft font-semibold text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      {count > 0 ? <span className="text-xs tabular-nums">{count}</span> : null}
    </Link>
  );
}
