import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, user, session, account, verification, users } from "@timeo/db";
import { generateId } from "@timeo/db";
import { eq } from "drizzle-orm";
import { sendMail } from "./email.js";
import {
  passwordResetEmail,
  verificationEmail,
  passwordResetSuccessEmail,
} from "./email-templates.js";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.timeo.my";
const marketingUrl = process.env.MARKETING_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://timeo.my";

// Trusted origins must include every real browser origin that can initiate auth flows.
const trustedOrigins = Array.from(
  new Set([
    siteUrl,
    apiUrl,
    appUrl,
    marketingUrl,
    "https://app.timeo.my",
    "https://timeo.my",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4000",
  ])
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Explicitly map Better Auth models to our Drizzle tables.
    // Better Auth expects singular model names (user, session, account, verification).
    schema: { user, session, account, verification },
  }),
  baseURL: apiUrl,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  // Include both 3000 and 3001 since Next.js auto-assigns 3001 when 3000 is taken
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const safeUrl = url.replace(/[<>"'&]/g, "");
      const email = passwordResetEmail({
        name: user.name || user.email,
        url: safeUrl,
      });
      await sendMail({
        to: user.email,
        subject: email.subject,
        html: email.html,
      });
    },
    onPasswordReset: async ({ user }) => {
      const email = passwordResetSuccessEmail({
        name: user.name || user.email,
      });
      await sendMail({
        to: user.email,
        subject: email.subject,
        html: email.html,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const safeUrl = url.replace(/[<>"'&]/g, "");
      const email = verificationEmail({
        name: user.name || user.email,
        url: safeUrl,
      });
      await sendMail({
        to: user.email,
        subject: email.subject,
        html: email.html,
      });
    },
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh session daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },
  advanced: {
    crossSubDomainCookies:
      process.env.NODE_ENV === "production"
        ? { enabled: true, domain: ".timeo.my" }
        : { enabled: false },
  },
  generateId: () => {
    return crypto.randomUUID();
  },
  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          // Sync the Better Auth user to our app-level users table
          const normalizedEmail = newUser.email.trim().toLowerCase();
          const shouldGrantPlatformAdmin =
            normalizedEmail === "jabez@oxloz.com";

          const existing = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.auth_id, newUser.id))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(users).values({
              id: generateId(),
              auth_id: newUser.id,
              email: newUser.email,
              name: newUser.name ?? newUser.email,
              role: shouldGrantPlatformAdmin ? "platform_admin" : "user",
            });
            return;
          }

          if (shouldGrantPlatformAdmin && existing[0].role !== "platform_admin") {
            await db
              .update(users)
              .set({ role: "platform_admin", updated_at: new Date() })
              .where(eq(users.id, existing[0].id));
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
