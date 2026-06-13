import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { messages } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export const messageRouter = createRouter({
  list: publicQuery
    .input(z.object({ roomId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(messages)
        .where(eq(messages.roomId, input.roomId))
        .orderBy(asc(messages.createdAt))
        .limit(200);
    }),

  send: publicQuery
    .input(
      z.object({
        roomId: z.number(),
        senderName: z.string().min(1).max(50),
        content: z.string().min(1).max(2000),
        type: z.enum(["chat", "system", "event", "reaction"]).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(messages).values({
        roomId: input.roomId,
        senderName: input.senderName,
        content: input.content,
        type: input.type ?? "chat",
        metadata: input.metadata ?? null,
      });

      const [msg] = await db
        .select()
        .from(messages)
        .where(eq(messages.roomId, input.roomId))
        .orderBy(asc(messages.createdAt))
        .limit(1);

      return msg;
    }),
});
