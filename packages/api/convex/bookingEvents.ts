import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "./lib/middleware";

export const listByBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    await requireTenantAccess(ctx, booking.tenantId);

    const events = await ctx.db
      .query("bookingEvents")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .order("desc")
      .collect();

    return await Promise.all(
      events.map(async (e) => {
        const actor = await ctx.db.get(e.actorId);
        return {
          ...e,
          actorName: actor?.name ?? "System",
        };
      })
    );
  },
});
