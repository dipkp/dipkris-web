import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env.js";
import * as schema from "../../db/schema.js";
import * as relations from "../../db/relations.js";
import path from "path";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const dbPath = env.databaseUrl || path.resolve("data.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    
    // Auto-create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS \`messages\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`roomId\` integer NOT NULL,
        \`senderName\` text NOT NULL,
        \`senderAvatar\` text,
        \`content\` text NOT NULL,
        \`type\` text DEFAULT 'chat' NOT NULL,
        \`metadata\` text,
        \`createdAt\` text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS \`room_members\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`roomId\` integer NOT NULL,
        \`userId\` integer,
        \`guestName\` text,
        \`isOnline\` integer DEFAULT true NOT NULL,
        \`joinedAt\` text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS \`rooms\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`code\` text NOT NULL,
        \`name\` text NOT NULL,
        \`hostId\` integer NOT NULL,
        \`isPublic\` integer DEFAULT false NOT NULL,
        \`currentVideo\` text,
        \`currentVideoTitle\` text,
        \`currentTime\` integer DEFAULT 0,
        \`isPlaying\` integer DEFAULT false,
        \`createdAt\` text NOT NULL,
        \`updatedAt\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`rooms_code_unique\` ON \`rooms\` (\`code\`);
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`unionId\` text NOT NULL,
        \`name\` text,
        \`email\` text,
        \`avatar\` text,
        \`role\` text DEFAULT 'user' NOT NULL,
        \`createdAt\` text NOT NULL,
        \`updatedAt\` text NOT NULL,
        \`lastSignInAt\` text NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`users_unionId_unique\` ON \`users\` (\`unionId\`);
      CREATE TABLE IF NOT EXISTS \`video_queue\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`roomId\` integer NOT NULL,
        \`title\` text NOT NULL,
        \`url\` text,
        \`source\` text DEFAULT 'url' NOT NULL,
        \`addedBy\` text NOT NULL,
        \`position\` integer DEFAULT 0,
        \`isActive\` integer DEFAULT false,
        \`createdAt\` text NOT NULL
      );
    `);

    instance = drizzle(sqlite, { schema: fullSchema });
  }
  return instance;
}
