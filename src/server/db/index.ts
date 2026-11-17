import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function createDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/planner.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { __allInPlannerDb?: Db };

export const db = globalForDb.__allInPlannerDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__allInPlannerDb = db;
}
