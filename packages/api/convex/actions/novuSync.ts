"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

function isNovuConfigured(): boolean {
  return !!process.env.NOVU_API_KEY;
}

async function novuRequest(
  path: string,
  method: string,
  body?: Record<string, unknown>
): Promise<boolean> {
  const apiKey = process.env.NOVU_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch(`https://api.novu.co/v1${path}`, {
      method,
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Novu] ${method} ${path} error: ${response.status} - ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Novu] ${method} ${path} failed:`, error);
    return false;
  }
}

/**
 * Sync a Timeo user to Novu as a subscriber.
 * Call this when a user is created or their profile is updated.
 */
export const syncSubscriber = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!isNovuConfigured()) return;

    const user = await ctx.runQuery(
      internal.notifications.getUserInternal,
      { userId: args.userId }
    );
    if (!user) return;

    const nameParts = user.name.split(" ");

    await novuRequest("/subscribers", "POST", {
      subscriberId: args.userId,
      email: user.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || undefined,
      avatar: user.avatarUrl,
      locale: "en",
    });
  },
});

/**
 * Remove a subscriber from Novu when a user is deleted.
 */
export const removeSubscriber = internalAction({
  args: { userId: v.id("users") },
  handler: async (_ctx, args) => {
    if (!isNovuConfigured()) return;
    await novuRequest(`/subscribers/${args.userId}`, "DELETE");
  },
});

/**
 * Sync notification preferences from Timeo to Novu subscriber preferences.
 */
export const syncPreferences = internalAction({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    if (!isNovuConfigured()) return;

    const prefs = await ctx.runQuery(
      internal.notifications.getUserPreferences,
      { userId: args.userId, tenantId: args.tenantId }
    );

    await novuRequest(
      `/subscribers/${args.userId}/preferences`,
      "PATCH",
      {
        channel: {
          email: prefs.emailBookingConfirm ?? true,
          push: prefs.pushEnabled ?? true,
          in_app: prefs.inAppEnabled ?? true,
        },
      }
    );
  },
});

/**
 * Set Expo push token as subscriber credentials in Novu.
 */
export const syncPushToken = internalAction({
  args: {
    userId: v.id("users"),
    token: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!isNovuConfigured()) return;

    await novuRequest(
      `/subscribers/${args.userId}/credentials`,
      "PUT",
      {
        providerId: "expo-push",
        credentials: {
          deviceTokens: [args.token],
        },
      }
    );
  },
});
