import * as cookie from "cookie";
import { Session } from "../contracts/constants.js";
import { getSessionCookieOptions } from "./lib/cookies.js";
import { createRouter, authedQuery, publicQuery } from "./middleware.js";
import { SignJWT } from "jose";
import { env } from "./lib/env.js";
import { upsertUser } from "./queries/users.js";
import { nanoid } from "nanoid";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),
  guestLogin: publicQuery.mutation(async ({ ctx }) => {
    if (ctx.user) return { success: true };

    console.log("Generating guest user...");
    const unionId = nanoid();
    const name = `Guest-${Math.floor(Math.random() * 10000)}`;

    console.log("Upserting user to DB...");
    await upsertUser({
      unionId,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${unionId}`,
      role: "user",
    });

    console.log("Signing JWT...");
    const secret = new TextEncoder().encode(env.appSecret);
    const token = await new SignJWT({ sub: unionId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1y")
      .sign(secret);

    console.log("Setting cookies...");
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }),
    );

    console.log("Guest login complete.");
    return { success: true };
  }),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
