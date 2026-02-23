import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>((components as any).betterAuth);

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
      disableCSRFCheck: true,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        // Log the reset email details for development.
        // In production, connect to Novu or another email provider.
        console.log(
          `[Auth] Password reset requested for ${user.email} — URL: ${url}`
        );

        // Send via HTTP if EMAIL_API_URL is configured
        const emailApiUrl = process.env.EMAIL_API_URL;
        if (emailApiUrl) {
          try {
            await fetch(emailApiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: user.email,
                subject: "Reset your Timeo password",
                html: `
                  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #0B0B0F;">Reset your password</h2>
                    <p>Hi ${user.name || "there"},</p>
                    <p>We received a request to reset your Timeo account password.</p>
                    <a href="${url}" style="display: inline-block; background: #FFB300; color: #0B0B0F; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                      Reset Password
                    </a>
                    <p style="color: #666; font-size: 14px; margin-top: 16px;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </div>
                `,
              }),
            });
          } catch (err) {
            console.error("[Auth] Failed to send reset email:", err);
          }
        }
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

