import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, user, session, account, verification } from "@timeo/db";
import { sendMail } from "./email.js";
import {
  passwordResetEmail,
  verificationEmail,
  passwordResetSuccessEmail,
} from "./email-templates.js";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

// Trusted origins: always include the configured site + API URLs plus dev defaults.
// In production SITE_URL=https://timeo.my and API_URL=https://api.timeo.my.
const trustedOrigins = Array.from(
  new Set([
    siteUrl,
    apiUrl,
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
    generateId: () => {
      return crypto.randomUUID();
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
