import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";
import path from "path";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // Force the database path to be 'data.db' in the current working directory.
    // This prevents stale 'mysql://' URLs from the environment being used as file paths.
    const dbPath = path.join(process.cwd(), "data.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    instance = drizzle(sqlite, { schema: fullSchema });
  }
  return instance;
}
