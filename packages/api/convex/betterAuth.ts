import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>((components as any).betterAuth);

/** Escape user-supplied strings before embedding them in HTML email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Auth] RESEND_API_KEY not set — email not sent to:", to);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "Timeo <noreply@timeo.my>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[Auth] Resend error:", res.status, body);
  }
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  // Env vars are only available during function execution, but registerRoutes
  // calls createAuth({}) at module load time to read basePath. Use fallbacks
  // for the module-load call; real values are used during actual requests.
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const secret = process.env.BETTER_AUTH_SECRET ?? "convex-module-load-placeholder";

  return betterAuth({
    baseURL: siteUrl,
    secret,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      "http://localhost:3000",
      "https://timeo.my",
      "https://www.timeo.my",
    ],
    advanced: {
      // disableCSRFCheck is required for cross-domain and native mobile (Expo) clients.
      // The crossDomain plugin handles the cross-origin session handoff via one-time tokens
      // and the trustedOrigins list enforces origin validation on all callback/redirect URLs.
      // Standard cookie-based CSRF tokens cannot be used when requests originate from native
      // app contexts (no shared cookie jar). This is the documented trade-off for this
      // architecture — see @convex-dev/better-auth crossDomain plugin docs.
      disableCSRFCheck: true,
    },
    // Rate limiting — applied per IP in production (memory storage).
    // customRules override the global defaults for sensitive auth endpoints.
    // window is in seconds; max is the request ceiling within that window.
    rateLimit: {
      enabled: true,
      window: 60,    // 1-minute default window
      max: 20,       // 20 requests/minute default (covers misc auth endpoints)
      customRules: {
        // Sign-in: 5 attempts per 5 minutes
        "/sign-in/email": { window: 300, max: 5 },
        // Sign-up: 3 registrations per 10 minutes
        "/sign-up/email": { window: 600, max: 3 },
        // Forgot / reset password: 3 requests per 10 minutes
        "/forget-password": { window: 600, max: 3 },
        "/reset-password": { window: 600, max: 3 },
        // Email verification resend: 3 per 10 minutes
        "/send-verification-email": { window: 600, max: 3 },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        const token = new URL(url).searchParams.get("token") ?? url;
        const verifyUrl = `${process.env.SITE_URL ?? "https://timeo.my"}/verify-email?token=${token}`;
        console.log(`[Auth] Sending verification email to ${user.email} — ${verifyUrl}`);
        await sendEmail({
          to: user.email,
          subject: "Verify your Timeo email",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 24px; font-weight: 700; color: #0B0B0F;">Timeo</span>
              </div>
              <h2 style="color: #0B0B0F; margin: 0 0 8px;">Verify your email</h2>
              <p style="color: #444; margin: 0 0 24px;">Hi ${escapeHtml(user.name || "there")},<br><br>Thanks for signing up! Click below to verify your email address and activate your account.</p>
              <a href="${verifyUrl}" style="display: inline-block; background: #FFB300; color: #0B0B0F; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
                Verify Email
              </a>
              <p style="color: #888; font-size: 13px; margin-top: 24px;">
                This link expires in 24 hours. If you didn't create a Timeo account, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      },
      sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
        console.log(`[Auth] Sending password reset email to ${user.email}`);
        await sendEmail({
          to: user.email,
          subject: "Reset your Timeo password",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 24px; font-weight: 700; color: #0B0B0F;">Timeo</span>
              </div>
              <h2 style="color: #0B0B0F; margin: 0 0 8px;">Reset your password</h2>
              <p style="color: #444; margin: 0 0 24px;">Hi ${escapeHtml(user.name || "there")},<br><br>We received a request to reset your Timeo password. Click below to choose a new one.</p>
              <a href="${url}" style="display: inline-block; background: #FFB300; color: #0B0B0F; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
                Reset Password
              </a>
              <p style="color: #888; font-size: 13px; margin-top: 24px;">
                This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      },
    },
    plugins: [
      convex({
        authConfig,
        jwt: {
          expirationSeconds: 60 * 30, // 30 minutes
          definePayload: ({ user, session }) => ({
            name: user.name,
            email: user.email,
            sessionId: session.id,
          }),
        },
      }),
      crossDomain({
        siteUrl,
      }),
    ],
  });
};
