import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { videoQueue } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export const queueRouter = createRouter({
  list: publicQuery
    .input(z.object({ roomId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(videoQueue)
        .where(eq(videoQueue.roomId, input.roomId))
        .orderBy(asc(videoQueue.position));
    }),

  add: publicQuery
    .input(
      z.object({
        roomId: z.number(),
        title: z.string().min(1).max(255),
        url: z.string().nullable().optional(),
        source: z.enum(["url", "file", "torrent", "browser"]).default("url"),
        addedBy: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(videoQueue)
        .where(eq(videoQueue.roomId, input.roomId));

      await db.insert(videoQueue).values({
        roomId: input.roomId,
        title: input.title,
        url: input.url ?? null,
        source: input.source,
        addedBy: input.addedBy,
        position: existing.length,
        isActive: existing.length === 0,
      });

      const [item] = await db
        .select()
        .from(videoQueue)
        .where(eq(videoQueue.roomId, input.roomId))
        .orderBy(asc(videoQueue.createdAt))
        .limit(1);

      return item;
    }),

  remove: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(videoQueue).where(eq(videoQueue.id, input.id));
      return { ok: true };
    }),

  setActive: publicQuery
    .input(z.object({ roomId: z.number(), id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(videoQueue)
        .set({ isActive: false })
        .where(eq(videoQueue.roomId, input.roomId));
      await db
        .update(videoQueue)
        .set({ isActive: true })
        .where(eq(videoQueue.id, input.id));
      return { ok: true };
    }),
});
