"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  bookingConfirmationTemplate,
  bookingReminderTemplate,
  bookingCancellationTemplate,
  orderUpdateTemplate,
  staffInvitationTemplate,
  paymentReceiptTemplate,
} from "../lib/emailTemplates";

// ── Email via Resend ─────────────────────────────────────────────────────

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email send");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Timeo <notifications@timeo.app>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Email] Resend API error: ${response.status} - ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

// ── Push via Expo Push API ───────────────────────────────────────────────

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  if (tokens.length === 0) return false;

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title,
    body,
    data: data ?? {},
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Push] Expo Push API error: ${response.status} - ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Push] Failed to send:", error);
    return false;
  }
}

// ── Notification Actions ─────────────────────────────────────────────────

export const sendBookingConfirmation = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.runQuery(
      internal.notifications.getBookingWithDetails,
      { bookingId: args.bookingId }
    );
    if (!booking) return;

    const prefs = await ctx.runQuery(internal.notifications.getUserPreferences, {
      userId: booking.customerId,
      tenantId: booking.tenantId,
    });

    // Create in-app notification
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: booking.customerId,
      tenantId: booking.tenantId,
      type: "booking_confirmed",
      title: "Booking Confirmed",
      body: `Your ${booking.serviceName} appointment has been confirmed.`,
      data: { bookingId: args.bookingId },
    });

    // Send email
    if (prefs.emailBookingConfirm && booking.customerEmail) {
      const html = bookingConfirmationTemplate({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        staffName: booking.staffName ?? undefined,
        startTime: booking.startTime,
        endTime: booking.endTime,
        tenantName: booking.tenantName,
        notes: booking.notes ?? undefined,
      });
      await sendEmailViaResend(
        booking.customerEmail,
        `Booking Confirmed — ${booking.serviceName}`,
        html
      );
    }

    // Send push notification
    if (prefs.pushEnabled) {
      const tokens = await ctx.runQuery(
        internal.notifications.getUserPushTokens,
        { userId: booking.customerId }
      );
      if (tokens.length > 0) {
        await sendExpoPush(
          tokens.map((t: any) => t.token),
          "Booking Confirmed",
          `Your ${booking.serviceName} appointment is confirmed.`,
          { bookingId: args.bookingId, type: "booking_confirmed" }
        );
      }
    }
  },
});

export const sendBookingCancellation = internalAction({
  args: {
    bookingId: v.id("bookings"),
    cancelledByUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.runQuery(
      internal.notifications.getBookingWithDetails,
      { bookingId: args.bookingId }
    );
    if (!booking) return;

    // Notify the customer
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: booking.customerId,
      tenantId: booking.tenantId,
      type: "booking_cancelled",
      title: "Booking Cancelled",
      body: `Your ${booking.serviceName} appointment has been cancelled.${args.reason ? ` Reason: ${args.reason}` : ""}`,
      data: { bookingId: args.bookingId },
    });

    if (booking.customerEmail) {
      const html = bookingCancellationTemplate({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        staffName: booking.staffName ?? undefined,
        startTime: booking.startTime,
        endTime: booking.endTime,
        tenantName: booking.tenantName,
        reason: args.reason,
        cancelledBy:
          args.cancelledByUserId === booking.customerId ? "customer" : "staff",
      });
      await sendEmailViaResend(
        booking.customerEmail,
        `Booking Cancelled — ${booking.serviceName}`,
        html
      );
    }

    // Push notification
    const tokens = await ctx.runQuery(
      internal.notifications.getUserPushTokens,
      { userId: booking.customerId }
    );
    if (tokens.length > 0) {
      await sendExpoPush(
        tokens.map((t: any) => t.token),
        "Booking Cancelled",
        `Your ${booking.serviceName} appointment was cancelled.`,
        { bookingId: args.bookingId, type: "booking_cancelled" }
      );
    }

    // If staff cancelled, also notify staff if it was customer-cancelled
    if (
      booking.staffId &&
      args.cancelledByUserId === booking.customerId
    ) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: booking.staffId,
        tenantId: booking.tenantId,
        type: "booking_cancelled",
        title: "Booking Cancelled by Customer",
        body: `${booking.customerName} cancelled their ${booking.serviceName} appointment.`,
        data: { bookingId: args.bookingId },
      });
    }
  },
});

export const sendBookingReminder = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.runQuery(
      internal.notifications.getBookingWithDetails,
      { bookingId: args.bookingId }
    );
    if (!booking) return;

    const prefs = await ctx.runQuery(internal.notifications.getUserPreferences, {
      userId: booking.customerId,
      tenantId: booking.tenantId,
    });

    // In-app notification
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: booking.customerId,
      tenantId: booking.tenantId,
      type: "booking_reminder",
      title: "Upcoming Appointment",
      body: `Your ${booking.serviceName} appointment is starting soon.`,
      data: { bookingId: args.bookingId },
    });

    // Email
    if (prefs.emailBookingReminder && booking.customerEmail) {
      const html = bookingReminderTemplate({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        staffName: booking.staffName ?? undefined,
        startTime: booking.startTime,
        endTime: booking.endTime,
        tenantName: booking.tenantName,
      });
      await sendEmailViaResend(
        booking.customerEmail,
        `Reminder: ${booking.serviceName} appointment today`,
        html
      );
    }

    // Push
    if (prefs.pushEnabled) {
      const tokens = await ctx.runQuery(
        internal.notifications.getUserPushTokens,
        { userId: booking.customerId }
      );
      if (tokens.length > 0) {
        await sendExpoPush(
          tokens.map((t: any) => t.token),
          "Upcoming Appointment",
          `Your ${booking.serviceName} appointment is starting soon!`,
          { bookingId: args.bookingId, type: "booking_reminder" }
        );
      }
    }
  },
});

export const sendOrderUpdate = internalAction({
  args: {
    orderId: v.id("orders"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(
      internal.notifications.getOrderWithDetails,
      { orderId: args.orderId }
    );
    if (!order) return;

    const statusLabels: Record<string, string> = {
      confirmed: "confirmed",
      preparing: "being prepared",
      ready: "ready for pickup",
      completed: "completed",
      cancelled: "cancelled",
    };
    const statusText = statusLabels[args.newStatus] ?? args.newStatus;

    // In-app notification
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: order.customerId,
      tenantId: order.tenantId,
      type: "order_update",
      title: `Order ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      body: `Your order at ${order.tenantName} is ${statusText}.`,
      data: { orderId: args.orderId, status: args.newStatus },
    });

    // Email
    const prefs = await ctx.runQuery(internal.notifications.getUserPreferences, {
      userId: order.customerId,
      tenantId: order.tenantId,
    });

    if (prefs.emailOrderUpdate && order.customerEmail) {
      const html = orderUpdateTemplate(
        {
          customerName: order.customerName,
          orderId: args.orderId,
          totalAmount: order.totalAmount,
          currency: order.currency,
          items: (order.items ?? []).map((item: any) => ({
            name: item.snapshotName,
            quantity: item.quantity,
            price: item.snapshotPrice,
          })),
          tenantName: order.tenantName,
        },
        args.newStatus
      );
      await sendEmailViaResend(
        order.customerEmail,
        `Order Update — ${statusText}`,
        html
      );
    }

    // Push
    if (prefs.pushEnabled) {
      const tokens = await ctx.runQuery(
        internal.notifications.getUserPushTokens,
        { userId: order.customerId }
      );
      if (tokens.length > 0) {
        await sendExpoPush(
          tokens.map((t: any) => t.token),
          `Order ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
          `Your order is ${statusText}.`,
          { orderId: args.orderId, type: "order_update" }
        );
      }
    }
  },
});

export const sendStaffInvitation = internalAction({
  args: {
    invitedUserId: v.id("users"),
    tenantId: v.id("tenants"),
    inviterName: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.runQuery(
      internal.notifications.getTenantInternal,
      { tenantId: args.tenantId }
    );
    const tenantName = tenant?.name ?? "an organization";

    // In-app notification
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: args.invitedUserId,
      tenantId: args.tenantId,
      type: "staff_invitation",
      title: "You're Invited!",
      body: `${args.inviterName} invited you to join ${tenantName} as ${args.role}.`,
      data: { tenantId: args.tenantId, role: args.role },
    });

    // Get invited user's email
    const invitedUser = await ctx.runQuery(
      internal.notifications.getUserInternal,
      { userId: args.invitedUserId }
    );
    if (invitedUser?.email) {
      const html = staffInvitationTemplate(
        tenantName,
        args.inviterName,
        args.role
      );
      await sendEmailViaResend(
        invitedUser.email,
        `You're invited to join ${tenantName}`,
        html
      );
    }

    // Push
    const tokens = await ctx.runQuery(
      internal.notifications.getUserPushTokens,
      { userId: args.invitedUserId }
    );
    if (tokens.length > 0) {
      await sendExpoPush(
        tokens.map((t: any) => t.token),
        "You're Invited!",
        `Join ${tenantName} as ${args.role}`,
        { tenantId: args.tenantId, type: "staff_invitation" }
      );
    }
  },
});

export const sendPaymentReceipt = internalAction({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.runQuery(
      internal.notifications.getPaymentInternal,
      { paymentId: args.paymentId }
    );
    if (!payment) return;

    const tenant = await ctx.runQuery(
      internal.notifications.getTenantInternal,
      { tenantId: payment.tenantId }
    );
    const customer = await ctx.runQuery(
      internal.notifications.getUserInternal,
      { userId: payment.customerId }
    );
    if (!customer) return;

    // In-app
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: payment.customerId,
      tenantId: payment.tenantId,
      type: "payment_received",
      title: "Payment Confirmed",
      body: `Payment of ${payment.currency} ${payment.amount.toFixed(2)} received.`,
      data: { paymentId: args.paymentId },
    });

    // Email
    if (customer.email) {
      const html = paymentReceiptTemplate({
        customerName: customer.name,
        amount: payment.amount,
        currency: payment.currency,
        tenantName: tenant?.name ?? "Store",
        description: payment.orderId ? "Order payment" : "Booking payment",
      });
      await sendEmailViaResend(
        customer.email,
        `Payment Receipt — ${payment.currency} ${payment.amount.toFixed(2)}`,
        html
      );
    }

    // Push
    const tokens = await ctx.runQuery(
      internal.notifications.getUserPushTokens,
      { userId: payment.customerId }
    );
    if (tokens.length > 0) {
      await sendExpoPush(
        tokens.map((t: any) => t.token),
        "Payment Confirmed",
        `${payment.currency} ${payment.amount.toFixed(2)} received.`,
        { paymentId: args.paymentId, type: "payment_received" }
      );
    }
  },
});

export const sendBookingReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ reminded: number }> => {
    const bookings = await ctx.runQuery(
      internal.notifications.getUpcomingBookingsForReminder,
      {}
    );

    for (const booking of bookings) {
      await ctx.runAction(internal.actions.notifications.sendBookingReminder, {
        bookingId: booking._id,
      });
    }

    return { reminded: bookings.length };
  },
});

export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.runQuery(
      internal.notifications.getUserPushTokens,
      { userId: args.userId }
    );

    if (tokens.length === 0) return { sent: false };

    const sent = await sendExpoPush(
      tokens.map((t: any) => t.token),
      args.title,
      args.body,
      args.data
    );

    return { sent };
  },
});
