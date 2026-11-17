import "server-only";
import { and, asc, count, desc, eq, getTableColumns, gt, gte, isNotNull, isNull, lte, lt, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { taskLists, tasks, type Task } from "@/server/db/schema";
import { addDays, startOfWeek, type ISODate } from "@/lib/dates";
import { currentStreak, longestStreak, nextOccurrence } from "@/lib/streaks";

export type TaskWithList = Task & { listName: string | null; listColor: string | null };

export type TaskView = "all" | "today" | "upcoming" | "someday" | "completed" | "list";

export interface TaskInput {
  title: string;
  notes: string | null;
  dueDate: ISODate | null;
  priority: Task["priority"];
  listId: string | null;
  recurrence: Task["recurrence"];
  status: Task["status"];
}

const columns = {
  ...getTableColumns(tasks),
  listName: taskLists.name,
  listColor: taskLists.color,
};

const isOpen = ne(tasks.status, "done");

const ordering = [
  sql`${tasks.dueDate} is null`,
  asc(tasks.dueDate),
  sql`case ${tasks.priority} when 'high' then 0 when 'medium' then 1 else 2 end`,
  asc(tasks.createdAt),
];

function select(userId: string, where: SQL | undefined) {
  return db
    .select(columns)
    .from(tasks)
    .leftJoin(taskLists, eq(tasks.listId, taskLists.id))
    .where(and(eq(tasks.userId, userId), where));
}

export async function listTasks(
  userId: string,
  view: TaskView,
  today: ISODate,
  listId?: string,
): Promise<TaskWithList[]> {
  switch (view) {
    case "today":
      return select(userId, and(isOpen, lte(tasks.dueDate, today))).orderBy(...ordering);
    case "upcoming":
      return select(userId, and(isOpen, gt(tasks.dueDate, today))).orderBy(...ordering);
    case "someday":
      return select(userId, and(isOpen, isNull(tasks.dueDate))).orderBy(...ordering);
    case "completed":
      return select(userId, eq(tasks.status, "done")).orderBy(desc(tasks.completedAt)).limit(100);
    case "list":
      return listId ? select(userId, and(isOpen, eq(tasks.listId, listId))).orderBy(...ordering) : [];
    default:
      return select(userId, isOpen).orderBy(...ordering);
  }
}

export async function getTask(userId: string, id: string): Promise<Task | null> {
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).limit(1);
  return task ?? null;
}

/** Open tasks due on or before `date` (when `date` is today this includes overdue work). */
export function tasksDueBy(userId: string, date: ISODate) {
  return select(userId, and(isOpen, lte(tasks.dueDate, date))).orderBy(...ordering);
}

export function tasksDueOn(userId: string, date: ISODate) {
  return select(userId, eq(tasks.dueDate, date)).orderBy(sql`${tasks.status} = 'done'`, ...ordering);
}

/** Every task (open or done) with a due date in [from, to], for the calendar. */
export function tasksDueBetween(userId: string, from: ISODate, to: ISODate) {
  return select(userId, and(gte(tasks.dueDate, from), lte(tasks.dueDate, to))).orderBy(...ordering);
}

export function openTasksAfter(userId: string, date: ISODate, until: ISODate, limit = 20) {
  return select(userId, and(isOpen, gt(tasks.dueDate, date), lte(tasks.dueDate, until)))
    .orderBy(...ordering)
    .limit(limit);
}

export function undatedOpenTasks(userId: string, limit = 20) {
  return select(userId, and(isOpen, isNull(tasks.dueDate))).orderBy(...ordering).limit(limit);
}

export function highPriorityOpenTasks(userId: string, limit = 8) {
  return select(userId, and(isOpen, eq(tasks.priority, "high"))).orderBy(...ordering).limit(limit);
}

export async function viewCounts(userId: string, today: ISODate) {
  const [row] = await db
    .select({
      all: sql<number>`sum(case when ${tasks.status} != 'done' then 1 else 0 end)`,
      today: sql<number>`sum(case when ${tasks.status} != 'done' and ${tasks.dueDate} <= ${today} then 1 else 0 end)`,
      overdue: sql<number>`sum(case when ${tasks.status} != 'done' and ${tasks.dueDate} < ${today} then 1 else 0 end)`,
      upcoming: sql<number>`sum(case when ${tasks.status} != 'done' and ${tasks.dueDate} > ${today} then 1 else 0 end)`,
      someday: sql<number>`sum(case when ${tasks.status} != 'done' and ${tasks.dueDate} is null then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId));
  const n = (v: number | null | undefined) => Number(v ?? 0);
  return {
    all: n(row?.all),
    today: n(row?.today),
    overdue: n(row?.overdue),
    upcoming: n(row?.upcoming),
    someday: n(row?.someday),
    completed: n(row?.completed),
  };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listTaskLists(userId: string) {
  return db
    .select({
      id: taskLists.id,
      name: taskLists.name,
      color: taskLists.color,
      openCount: sql<number>`count(${tasks.id})`,
    })
    .from(taskLists)
    .leftJoin(tasks, and(eq(tasks.listId, taskLists.id), isOpen))
    .where(eq(taskLists.userId, userId))
    .groupBy(taskLists.id)
    // rowid preserves insertion order for lists created in the same batch.
    .orderBy(asc(taskLists.createdAt), sql`${taskLists}.rowid`);
}

export async function listBelongsToUser(userId: string, listId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: taskLists.id })
    .from(taskLists)
    .where(and(eq(taskLists.id, listId), eq(taskLists.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/** Returns false when the user already has a list with that name. */
export async function createTaskList(userId: string, input: { name: string; color: string }): Promise<boolean> {
  try {
    await db.insert(taskLists).values({ userId, ...input });
    return true;
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) return false;
    throw error;
  }
}

/** Deletes the list; its tasks stay, without a list. */
export async function deleteTaskList(userId: string, listId: string): Promise<void> {
  await db.batch([
    db.update(tasks).set({ listId: null }).where(and(eq(tasks.userId, userId), eq(tasks.listId, listId))),
    db.delete(taskLists).where(and(eq(taskLists.id, listId), eq(taskLists.userId, userId))),
  ]);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function completionFields(status: Task["status"], today: ISODate) {
  return status === "done"
    ? { completedAt: new Date(), completedOn: today }
    : { completedAt: null, completedOn: null };
}

export async function createTask(userId: string, input: TaskInput, today: ISODate): Promise<Task> {
  const [task] = await db
    .insert(tasks)
    .values({ userId, ...input, ...completionFields(input.status, today) })
    .returning();
  return task;
}

export async function updateTask(userId: string, id: string, input: TaskInput, today: ISODate): Promise<Task | null> {
  const existing = await getTask(userId, id);
  if (!existing) return null;
  const becameDone = existing.status !== "done" && input.status === "done";
  const [task] = await db
    .update(tasks)
    .set({
      ...input,
      ...(existing.status === "done" && input.status === "done" ? {} : completionFields(input.status, today)),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  if (becameDone) await spawnNextOccurrence(task, today);
  return task;
}

/** Checks a task off (or reopens it). Completing a recurring task schedules the next one. */
export async function setTaskDone(userId: string, id: string, done: boolean, today: ISODate): Promise<Task | null> {
  const existing = await getTask(userId, id);
  if (!existing) return null;
  if ((existing.status === "done") === done) return existing;
  const [task] = await db
    .update(tasks)
    .set({ status: done ? "done" : "todo", ...completionFields(done ? "done" : "todo", today) })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  if (done) await spawnNextOccurrence(task, today);
  return task;
}

async function spawnNextOccurrence(task: Task, today: ISODate) {
  if (task.recurrence === "none") return;
  await db.insert(tasks).values({
    userId: task.userId,
    listId: task.listId,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    recurrence: task.recurrence,
    status: "todo",
    dueDate: nextOccurrence(task.recurrence, task.dueDate, today),
  });
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function taskStats(userId: string, today: ISODate) {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const [counts, [week], completionDays] = await Promise.all([
    viewCounts(userId, today),
    db
      .select({
        dueThisWeek: count(),
        doneThisWeek: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.dueDate, weekStart), lte(tasks.dueDate, weekEnd))),
    db
      .selectDistinct({ day: tasks.completedOn })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.completedOn))),
  ]);

  const days = completionDays.map((d) => d.day).filter((d): d is string => d !== null);
  const [completedThisWeek] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.completedOn, weekStart), lt(tasks.completedOn, addDays(weekEnd, 1))));

  const dueThisWeek = Number(week?.dueThisWeek ?? 0);
  const doneThisWeek = Number(week?.doneThisWeek ?? 0);
  return {
    ...counts,
    completedThisWeek: Number(completedThisWeek?.n ?? 0),
    dueThisWeek,
    doneOfDueThisWeek: doneThisWeek,
    completionRate: dueThisWeek === 0 ? null : doneThisWeek / dueThisWeek,
    currentStreak: currentStreak(days, today),
    longestStreak: longestStreak(days),
  };
}
