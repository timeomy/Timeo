import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@timeo/db";
import { users, account as authAccount } from "@timeo/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /api/users/me — current user profile including force_password_reset flag
app.get("/me", authMiddleware, async (c) => {
  const authUser = c.get("user");

  const [appUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatar_url: users.avatar_url,
      force_password_reset: users.force_password_reset,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!appUser) {
    return c.json(error("USER_NOT_FOUND", "User not found"), 404);
  }

  return c.json(success(appUser));
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/users/me/change-password — change password and clear force_password_reset flag
app.post(
  "/me/change-password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const authUser = c.get("user");
    const { currentPassword, newPassword } = c.req.valid("json");

    // Verify current password against Better Auth account record
    const [accountRecord] = await db
      .select({ id: authAccount.id, password: authAccount.password })
      .from(authAccount)
      .where(eq(authAccount.userId, authUser.authId))
      .limit(1);

    if (!accountRecord?.password) {
      return c.json(error("NO_PASSWORD", "No password set for this account"), 400);
    }

    const { verifyPassword } = await import("better-auth/crypto");
    const isValid = await verifyPassword({ password: currentPassword, hash: accountRecord.password });

    if (!isValid) {
      return c.json(error("INVALID_PASSWORD", "Current password is incorrect"), 400);
    }

    // Hash new password and update
    const { hashPassword } = await import("better-auth/crypto");
    const newHash = await hashPassword(newPassword);

    await db
      .update(authAccount)
      .set({ password: newHash, updatedAt: new Date() })
      .where(eq(authAccount.id, accountRecord.id));

    // Clear the force_password_reset flag
    await db
      .update(users)
      .set({ force_password_reset: false, updated_at: new Date() })
      .where(eq(users.id, authUser.id));

    return c.json(success({ message: "Password changed successfully" }));
  },
);

export { app as usersRouter };
