import { authRouter } from "./auth-router.js";
import { roomRouter } from "./room-router.js";
import { messageRouter } from "./message-router.js";
import { queueRouter } from "./queue-router.js";
import { createRouter, publicQuery } from "./middleware.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  room: roomRouter,
  message: messageRouter,
  queue: queueRouter,
});

export type AppRouter = typeof appRouter;
