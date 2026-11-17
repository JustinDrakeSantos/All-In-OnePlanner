import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { journalEntries, type JournalEntry } from "@/server/db/schema";
import type { ISODate } from "@/lib/dates";

export type JournalKind = JournalEntry["kind"];

export interface JournalInput {
  date: ISODate;
  kind: JournalKind;
  title: string;
  body: string;
  prompt: string | null;
  tags: string[];
}

export type JournalEntryView = Omit<JournalEntry, "tags"> & { tags: string[] };

const encodeTags = (tags: string[]) => (tags.length ? `,${tags.join(",")},` : "");
const decodeTags = (stored: string) => stored.split(",").filter(Boolean);
const toView = (entry: JournalEntry): JournalEntryView => ({ ...entry, tags: decodeTags(entry.tags) });

/** Escapes LIKE wildcards so a search for "50%" means the literal text. */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listEntries(
  userId: string,
  filters: { q?: string; tag?: string; kind?: JournalKind; limit?: number } = {},
): Promise<JournalEntryView[]> {
  const conditions = [eq(journalEntries.userId, userId)];
  if (filters.kind) conditions.push(eq(journalEntries.kind, filters.kind));
  if (filters.tag) {
    conditions.push(sql`${journalEntries.tags} like ${`%,${likeEscape(filters.tag)},%`} escape '\\'`);
  }
  if (filters.q) {
    const pattern = `%${likeEscape(filters.q)}%`;
    conditions.push(
      or(
        sql`${journalEntries.title} like ${pattern} escape '\\'`,
        sql`${journalEntries.body} like ${pattern} escape '\\'`,
      )!,
    );
  }
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(...conditions))
    .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
    .limit(filters.limit ?? 200);
  return rows.map(toView);
}

export async function getEntry(userId: string, id: string): Promise<JournalEntryView | null> {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);
  return entry ? toView(entry) : null;
}

export async function entriesOn(userId: string, date: ISODate): Promise<JournalEntryView[]> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)))
    .orderBy(desc(journalEntries.createdAt));
  return rows.map(toView);
}

export async function createEntry(userId: string, input: JournalInput): Promise<JournalEntryView> {
  const [entry] = await db
    .insert(journalEntries)
    .values({ userId, ...input, tags: encodeTags(input.tags) })
    .returning();
  return toView(entry);
}

export async function updateEntry(userId: string, id: string, input: JournalInput): Promise<JournalEntryView | null> {
  const [entry] = await db
    .update(journalEntries)
    .set({ ...input, tags: encodeTags(input.tags) })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  return entry ? toView(entry) : null;
}

export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning({ id: journalEntries.id });
  return deleted.length > 0;
}

/** Every tag the user has used, most frequent first. */
export async function listTags(userId: string): Promise<{ tag: string; count: number }[]> {
  const rows = await db
    .select({ tags: journalEntries.tags })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), sql`${journalEntries.tags} != ''`));
  const counts = new Map<string, number>();
  for (const row of rows) for (const tag of decodeTags(row.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function journalDays(userId: string): Promise<ISODate[]> {
  const rows = await db
    .selectDistinct({ date: journalEntries.date })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId));
  return rows.map((r) => r.date);
}
