/**
 * Applies pending SQL migrations from ./drizzle to the configured database.
 * Runs automatically before `npm run dev` and `npm run start`.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // The file is optional.
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL ?? "file:./data/planner.db";
  if (url.startsWith("file:")) {
    mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });
  }

  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  await migrate(drizzle(client), { migrationsFolder: path.resolve("drizzle") });
  client.close();
  console.log(`Database is up to date (${url.startsWith("file:") ? url : "remote libsql"}).`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
