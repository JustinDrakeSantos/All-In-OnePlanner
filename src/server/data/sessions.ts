import "server-only";
import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { sessions, users, type User } from "@/server/db/schema";
import { generateToken, hashToken } from "@/server/auth/tokens";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSessionRecord(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  // Opportunistic cleanup of this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return { token, expiresAt };
}

export async function validateSessionToken(token: string): Promise<User | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return row.user;
}

export async function deleteSessionRecord(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Signs the user out everywhere, optionally keeping the current session. */
export async function deleteUserSessions(userId: string, keepToken?: string): Promise<void> {
  await db
    .delete(sessions)
    .where(keepToken ? and(eq(sessions.userId, userId), ne(sessions.id, hashToken(keepToken))) : eq(sessions.userId, userId));
}
