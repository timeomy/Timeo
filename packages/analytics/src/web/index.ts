// ─── Web (Next.js) Analytics Exports ─────────────────────────────────

// Events (shared types)
export type {
  TimeoEvent,
  TimeoEventMap,
  BookingCreatedProps,
  BookingCancelledProps,
  BookingCompletedProps,
  ServiceViewedProps,
  ServiceListViewedProps,
  ProductViewedProps,
  ProductListViewedProps,
  AddToCartProps,
  CheckoutStartedProps,
  OrderPlacedProps,
  PaymentCompletedProps,
  SignedInProps,
  SignedUpProps,
  TenantSwitchedProps,
} from "../events";

// Provider
export { TimeoWebAnalyticsProvider } from "./provider";
export type { TimeoWebAnalyticsProviderProps } from "./provider";

// Hooks
export { usePostHogWeb, useTrackEventWeb, useFeatureFlagWeb } from "./hooks";

// Identify
export { identifyUserWeb, resetUser } from "../identify";
export type { IdentifyUserProps } from "../identify";

// Groups
export { setTenantGroupWeb } from "../groups";
export type { TenantGroupProps } from "../groups";
