import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const sendBookingConfirmation = action({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.runQuery(api.bookings.getById, {
      bookingId: args.bookingId,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Integration point: send push notification, email, or SMS
    // Examples:
    // - Firebase Cloud Messaging for mobile push
    // - SendGrid/Resend for email
    // - Twilio for SMS
    console.log(
      `[Notification] Booking confirmed: ${booking._id} for ${booking.customerName} — ${booking.serviceName} at ${new Date(booking.startTime).toISOString()}`
    );

    return { sent: true, bookingId: args.bookingId };
  },
});

export const sendOrderUpdate = action({
  args: {
    orderId: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(api.orders.getById, {
      orderId: args.orderId,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Integration point: send push notification, email, or SMS
    console.log(
      `[Notification] Order ${args.status}: ${order._id} for ${order.customerName} — ${order.currency} ${order.totalAmount}`
    );

    return { sent: true, orderId: args.orderId, status: args.status };
  },
});
