import { query } from "./_generated/server";
import { v } from "convex/values";
import { authenticateUser } from "./lib/middleware";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await authenticateUser(ctx);
    return user;
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    return user;
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await authenticateUser(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  },
});
