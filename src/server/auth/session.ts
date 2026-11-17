import "server-only";
import { cookies } from "next/headers";
import { createSessionRecord, deleteSessionRecord } from "@/server/data/sessions";

export const SESSION_COOKIE = "aip_session";

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Creates a session row and sets the httpOnly cookie. Server Actions and Route Handlers only. */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSessionRecord(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the current session row (if any) and clears the cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionRecord(token);
  store.delete(SESSION_COOKIE);
}
