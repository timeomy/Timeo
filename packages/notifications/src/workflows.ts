/**
 * Novu workflow identifiers for Timeo.
 *
 * These IDs must match the workflows configured in the Novu dashboard.
 * Each workflow defines its own channel steps (email, push, in-app, SMS, etc.)
 * and templates within the Novu UI.
 */
export const WORKFLOWS = {
  /** Sent when a booking is confirmed */
  BOOKING_CONFIRMATION: "booking-confirmation",
  /** Sent when a booking is cancelled */
  BOOKING_CANCELLATION: "booking-cancellation",
  /** Sent as a reminder before an upcoming booking */
  BOOKING_REMINDER: "booking-reminder",
  /** Sent when an order status changes */
  ORDER_UPDATE: "order-update",
  /** Sent when a payment is successfully processed */
  PAYMENT_RECEIPT: "payment-receipt",
  /** Sent when a user is invited to join a tenant as staff */
  STAFF_INVITATION: "staff-invitation",
} as const;

export type WorkflowId = (typeof WORKFLOWS)[keyof typeof WORKFLOWS];

// ── Payload types for each workflow ─────────────────────────────────────

export interface BookingConfirmationPayload {
  customerName: string;
  serviceName: string;
  staffName?: string;
  startTime: number;
  endTime: number;
  tenantName: string;
  notes?: string;
  bookingId: string;
}

export interface BookingCancellationPayload {
  customerName: string;
  serviceName: string;
  staffName?: string;
  startTime: number;
  endTime: number;
  tenantName: string;
  reason?: string;
  cancelledBy: "customer" | "staff";
  bookingId: string;
}

export interface BookingReminderPayload {
  customerName: string;
  serviceName: string;
  staffName?: string;
  startTime: number;
  endTime: number;
  tenantName: string;
  bookingId: string;
}

export interface OrderUpdatePayload {
  customerName: string;
  orderId: string;
  totalAmount: number;
  currency: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  tenantName: string;
  newStatus: string;
  statusLabel: string;
}

export interface PaymentReceiptPayload {
  customerName: string;
  amount: number;
  currency: string;
  tenantName: string;
  description: string;
  paymentId: string;
}

export interface StaffInvitationPayload {
  tenantName: string;
  inviterName: string;
  role: string;
  tenantId: string;
}
