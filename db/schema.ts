import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
  lastSignInAt: text("lastSignInAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  hostId: integer("hostId").notNull(),
  isPublic: integer("isPublic", { mode: "boolean" }).default(false).notNull(),
  currentVideo: text("currentVideo"),
  currentVideoTitle: text("currentVideoTitle"),
  currentTime: integer("currentTime").default(0),
  isPlaying: integer("isPlaying", { mode: "boolean" }).default(false),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

export const roomMembers = sqliteTable("room_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("roomId").notNull(),
  userId: integer("userId"),
  guestName: text("guestName"),
  isOnline: integer("isOnline", { mode: "boolean" }).default(true).notNull(),
  joinedAt: text("joinedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type RoomMember = typeof roomMembers.$inferSelect;

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("roomId").notNull(),
  senderName: text("senderName").notNull(),
  senderAvatar: text("senderAvatar"),
  content: text("content").notNull(),
  type: text("type", { enum: ["chat", "system", "event", "reaction"] }).default("chat").notNull(),
  metadata: text("metadata", { mode: "json" }),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Message = typeof messages.$inferSelect;

export const videoQueue = sqliteTable("video_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("roomId").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  source: text("source", { enum: ["url", "file", "torrent", "browser"] }).default("url").notNull(),
  addedBy: text("addedBy").notNull(),
  position: integer("position").default(0),
  isActive: integer("isActive", { mode: "boolean" }).default(false),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type VideoQueueItem = typeof videoQueue.$inferSelect;
