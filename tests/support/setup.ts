import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// Each test file gets its own throwaway database file, migrated from ./drizzle.
const file = path.join(tmpdir(), `all-in-planner-test-${randomUUID()}.db`).replaceAll("\\", "/");
process.env.DATABASE_URL = `file:${file}`;

const client = createClient({ url: process.env.DATABASE_URL });
await migrate(drizzle(client), { migrationsFolder: path.resolve("drizzle") });
client.close();
