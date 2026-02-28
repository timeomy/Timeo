import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@timeo/db";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: apiUrl,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [siteUrl, "http://localhost:3000", "http://localhost:4000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const safeUrl = url.replace(/[<>"'&]/g, "");
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "noreply@timeo.my",
        to: user.email,
        subject: "Reset your Timeo password",
        html: `<p>Click <a href="${safeUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const safeUrl = url.replace(/[<>"'&]/g, "");
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "noreply@timeo.my",
        to: user.email,
        subject: "Verify your Timeo email",
        html: `<p>Click <a href="${safeUrl}">here</a> to verify your email address.</p>`,
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
    crossSubDomainCookies: {
      enabled: true,
      domain: ".timeo.my",
    },
    generateId: () => {
      return crypto.randomUUID();
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
