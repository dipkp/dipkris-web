import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { findUserByUnionId } from "./queries/users";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const cookieHeader = opts.req.headers.get("cookie") || "";
    const cookies = cookie.parse(cookieHeader);
    const token = cookies[Session.cookieName];

    if (token) {
      const secret = new TextEncoder().encode(env.appSecret);
      const { payload } = await jwtVerify(token, secret);
      if (payload.sub) {
        const user = await findUserByUnionId(payload.sub);
        if (user) ctx.user = user;
      }
    }
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
