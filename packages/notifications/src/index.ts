// Client
export { getNovu, isNovuConfigured } from "./novu";

// Workflows & payload types
export {
  WORKFLOWS,
  type WorkflowId,
  type BookingConfirmationPayload,
  type BookingCancellationPayload,
  type BookingReminderPayload,
  type OrderUpdatePayload,
  type PaymentReceiptPayload,
  type StaffInvitationPayload,
} from "./workflows";

// Subscriber management
export {
  upsertSubscriber,
  deleteSubscriber,
  updateSubscriberPreferences,
  setExpoPushCredentials,
  type TimeoSubscriber,
} from "./subscribers";

// Type-safe triggers
export {
  triggerBookingConfirmation,
  triggerBookingCancellation,
  triggerBookingReminder,
  triggerOrderUpdate,
  triggerPaymentReceipt,
  triggerStaffInvitation,
} from "./triggers";
