import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
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
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
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
    ],
  });
};

