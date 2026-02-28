import { pgEnum } from "drizzle-orm/pg-core";

// ─── Tenant ──────────────────────────────────────────────────────────────────
export const tenantPlanEnum = pgEnum("tenant_plan", [
  "free",
  "starter",
  "pro",
  "enterprise",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "trial",
]);

export const tenantIdTypeEnum = pgEnum("tenant_id_type", [
  "brn",
  "nric",
  "passport",
  "army",
]);

export const paymentGatewayEnum = pgEnum("payment_gateway", [
  "stripe",
  "revenue_monster",
  "both",
]);

// ─── Member ──────────────────────────────────────────────────────────────────
export const memberRoleEnum = pgEnum("member_role", [
  "customer",
  "staff",
  "admin",
  "platform_admin",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "suspended",
]);

// ─── Booking ─────────────────────────────────────────────────────────────────
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const bookingEventTypeEnum = pgEnum("booking_event_type", [
  "created",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
  "rescheduled",
  "note_added",
]);

// ─── Order ───────────────────────────────────────────────────────────────────
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_payment",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);

// ─── Membership Interval ─────────────────────────────────────────────────────
export const membershipIntervalEnum = pgEnum("membership_interval", [
  "monthly",
  "yearly",
]);

// ─── Payment ─────────────────────────────────────────────────────────────────
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

export const stripeAccountStatusEnum = pgEnum("stripe_account_status", [
  "pending",
  "active",
  "restricted",
]);

// ─── Notification ────────────────────────────────────────────────────────────
export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_confirmed",
  "booking_cancelled",
  "booking_reminder",
  "order_update",
  "staff_invitation",
  "payment_received",
  "check_in",
  "session_logged",
  "credits_low",
  "voucher_received",
  "receipt",
  "system",
]);

export const pushTokenPlatformEnum = pgEnum("push_token_platform", [
  "ios",
  "android",
  "web",
]);

// ─── Fitness ─────────────────────────────────────────────────────────────────
export const checkInMethodEnum = pgEnum("check_in_method", [
  "qr",
  "nfc",
  "manual",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "personal_training",
  "group_class",
  "assessment",
  "consultation",
]);

// ─── Vouchers & Gift Cards ──────────────────────────────────────────────────
export const voucherTypeEnum = pgEnum("voucher_type", [
  "percentage",
  "fixed",
  "free_session",
]);

export const voucherSourceEnum = pgEnum("voucher_source", [
  "internal",
  "partner",
  "public",
]);

export const giftCardStatusEnum = pgEnum("gift_card_status", [
  "active",
  "depleted",
  "expired",
  "cancelled",
]);

export const giftCardTransactionTypeEnum = pgEnum(
  "gift_card_transaction_type",
  ["purchase", "redemption", "refund", "topup"],
);

// ─── POS ─────────────────────────────────────────────────────────────────────
export const posPaymentMethodEnum = pgEnum("pos_payment_method", [
  "cash",
  "card",
  "qr_pay",
  "bank_transfer",
  "revenue_monster",
]);

export const posTransactionStatusEnum = pgEnum("pos_transaction_status", [
  "completed",
  "voided",
  "refunded",
]);

// ─── e-Invoice ───────────────────────────────────────────────────────────────
export const eInvoiceStatusEnum = pgEnum("e_invoice_status", [
  "pending",
  "submitted",
  "rejected",
]);

export const eInvoiceIdTypeEnum = pgEnum("e_invoice_id_type", [
  "nric",
  "passport",
  "brn",
  "army",
]);

// ─── Files ───────────────────────────────────────────────────────────────────
export const fileTypeEnum = pgEnum("file_type", [
  "product_image",
  "service_image",
  "avatar",
  "logo",
  "document",
]);
