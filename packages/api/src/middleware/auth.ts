import { createMiddleware } from "hono/factory";
import { db } from "@timeo/db";
import { users } from "@timeo/db/schema";
import { eq } from "drizzle-orm";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  authId: string;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    tenantId: string;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const { auth } = await import("@timeo/auth/server");

  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      401,
    );
  }

  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.auth_id, session.user.id))
    .limit(1);

  if (!appUser) {
    return c.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile not found" },
      },
      404,
    );
  }

  c.set("user", {
    id: appUser.id,
    email: appUser.email,
    name: appUser.name,
    authId: session.user.id,
  });

  await next();
});

export const optionalAuth = createMiddleware(async (c, next) => {
  try {
    const { auth } = await import("@timeo/auth/server");
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (session?.user) {
      const [appUser] = await db
        .select()
        .from(users)
        .where(eq(users.auth_id, session.user.id))
        .limit(1);
      if (appUser) {
        c.set("user", {
          id: appUser.id,
          email: appUser.email,
          name: appUser.name,
          authId: session.user.id,
        });
      }
    }
  } catch {
    // Optional auth - continue without user
  }
  await next();
});
