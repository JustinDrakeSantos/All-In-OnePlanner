import "server-only";
import { cookies } from "next/headers";
import { createSessionRecord, deleteSessionRecord } from "@/server/data/sessions";

export const SESSION_COOKIE = "aip_session";

/**
 * Secure cookies in production, unless the configured public URL is plain http: a production
 * build served on a local network for testing (APP_URL=http://192.168.1.20:3000). Browsers refuse
 * Secure cookies from http pages other than localhost, so without this the login never sticks.
 * HTTPS hosts (Render's https service URL, or an https APP_URL) always get Secure.
 */
export function secureSessionCookie(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return false;
  const publicUrl = env.APP_URL || env.RENDER_EXTERNAL_URL;
  return !publicUrl?.toLowerCase().startsWith("http://");
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Creates a session row and sets the httpOnly cookie. Server Actions and Route Handlers only. */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSessionRecord(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureSessionCookie(),
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
