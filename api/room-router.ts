import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { rooms, roomMembers, messages } from "@db/schema";
import { eq, desc } from "drizzle-orm";

import { customAlphabet } from "nanoid";

function genCode(): string {
  // Unambiguous alphabet: Removed 0, O, 1, I, L, 5, S, 8, B to prevent typos
  const nanoid = customAlphabet("234679ACDEFGHJKMNPQRTUVWXYZ", 6);
  return nanoid();
}

export const roomRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(100),
        hostName: z.string().min(1).max(50),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const code = genCode();

      await db.insert(rooms).values({
        code,
        name: input.name,
        hostId: 0,
        isPublic: input.isPublic ?? false,
      });

      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, code))
        .limit(1);

      await db.insert(roomMembers).values({
        roomId: room.id,
        guestName: input.hostName,
        isOnline: true,
      });

      await db.insert(messages).values({
        roomId: room.id,
        senderName: "System",
        content: `Room "${input.name}" created! Share code: ${code}`,
        type: "system",
      });

      return { room };
    }),

  join: publicQuery
    .input(
      z.object({
        code: z.string().length(6),
        guestName: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, input.code.toUpperCase()))
        .limit(1);

      if (!room) {
        throw new Error("Room not found");
      }

      await db.insert(roomMembers).values({
        roomId: room.id,
        guestName: input.guestName,
        isOnline: true,
      });

      await db.insert(messages).values({
        roomId: room.id,
        senderName: "System",
        content: `${input.guestName} joined the room`,
        type: "system",
      });

      return { room };
    }),

  get: publicQuery
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, input.code.toUpperCase()))
        .limit(1);
      return room ?? null;
    }),

  listPublic: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(rooms)
      .where(eq(rooms.isPublic, true))
      .orderBy(desc(rooms.updatedAt))
      .limit(20);
  }),

  members: publicQuery
    .input(z.object({ roomId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(roomMembers)
        .where(eq(roomMembers.roomId, input.roomId));
    }),

  updateVideo: publicQuery
    .input(
      z.object({
        roomId: z.number(),
        currentVideo: z.string().nullable(),
        currentVideoTitle: z.string().nullable(),
        currentTime: z.number().optional(),
        isPlaying: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { roomId, ...data } = input;
      await db.update(rooms).set(data).where(eq(rooms.id, roomId));
      return { ok: true };
    }),
});
