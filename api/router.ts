import { authRouter } from "./auth-router";
import { roomRouter } from "./room-router";
import { messageRouter } from "./message-router";
import { queueRouter } from "./queue-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  room: roomRouter,
  message: messageRouter,
  queue: queueRouter,
});

export type AppRouter = typeof appRouter;
