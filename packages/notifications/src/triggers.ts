import { getNovu, isNovuConfigured } from "./novu";
import {
  WORKFLOWS,
  type BookingConfirmationPayload,
  type BookingCancellationPayload,
  type BookingReminderPayload,
  type OrderUpdatePayload,
  type PaymentReceiptPayload,
  type StaffInvitationPayload,
} from "./workflows";

interface TriggerOptions {
  /** The Novu subscriberId (Timeo user ID) */
  subscriberId: string;
  /** Optional tenant identifier for multi-tenant isolation */
  tenantId?: string;
}

/**
 * Low-level trigger helper. All specific triggers delegate to this.
 * Returns false if Novu is not configured (graceful degradation).
 */
async function trigger(
  workflowId: string,
  opts: TriggerOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<boolean> {
  if (!isNovuConfigured()) {
    console.warn(
      `[Novu] Not configured, skipping trigger for workflow: ${workflowId}`
    );
    return false;
  }

  try {
    const novu = getNovu();
    await novu.trigger(workflowId, {
      to: { subscriberId: opts.subscriberId },
      payload,
      ...(opts.tenantId ? { tenant: opts.tenantId } : {}),
    });
    return true;
  } catch (error) {
    console.error(`[Novu] Failed to trigger ${workflowId}:`, error);
    return false;
  }
}

// ── Type-safe trigger functions ──────────────────────────────────────────

export async function triggerBookingConfirmation(
  opts: TriggerOptions,
  payload: BookingConfirmationPayload
): Promise<boolean> {
  return trigger(WORKFLOWS.BOOKING_CONFIRMATION, opts, { ...payload });
}

export async function triggerBookingCancellation(
  opts: TriggerOptions,
  payload: BookingCancellationPayload
): Promise<boolean> {
  return trigger(WORKFLOWS.BOOKING_CANCELLATION, opts, { ...payload });
}

export async function triggerBookingReminder(
  opts: TriggerOptions,
  payload: BookingReminderPayload
): Promise<boolean> {
  return trigger(WORKFLOWS.BOOKING_REMINDER, opts, { ...payload });
}

export async function triggerOrderUpdate(
  opts: TriggerOptions,
  payload: OrderUpdatePayload
): Promise<boolean> {
  return trigger(WORKFLOWS.ORDER_UPDATE, opts, { ...payload });
}

export async function triggerPaymentReceipt(
  opts: TriggerOptions,
  payload: PaymentReceiptPayload
): Promise<boolean> {
  return trigger(WORKFLOWS.PAYMENT_RECEIPT, opts, { ...payload });
}

export async function triggerStaffInvitation(
  opts: TriggerOptions,
  payload: StaffInvitationPayload
): Promise<boolean> {
  return trigger(WORKFLOWS.STAFF_INVITATION, opts, { ...payload });
}
