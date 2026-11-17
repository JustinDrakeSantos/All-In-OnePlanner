import "server-only";
import { headers } from "next/headers";

/**
 * A small in-memory sliding-window limiter. It protects a single server
 * process; behind several instances, swap it for a shared store (e.g. Redis).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * The client's IP address, but only when a trusted reverse proxy sets it.
 * X-Forwarded-For is just a request header, so without a proxy that overwrites
 * it anyone could rotate it to dodge per-IP limits. Set TRUST_PROXY=1 when the
 * app runs behind one (Vercel is detected automatically). Returns null otherwise.
 */
export async function clientIp(): Promise<string | null> {
  if (!process.env.TRUST_PROXY && !process.env.VERCEL) return null;
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/**
 * Per-IP limit when the IP is trustworthy, otherwise a shared, more generous
 * limit for everyone, so a single process is still protected from floods.
 */
export async function rateLimitByClient(
  action: string,
  perIp: number,
  globalLimit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const ip = await clientIp();
  return ip ? rateLimit(`${action}:ip:${ip}`, perIp, windowMs) : rateLimit(`${action}:global`, globalLimit, windowMs);
}
