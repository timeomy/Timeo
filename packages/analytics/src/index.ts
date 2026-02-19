// ─── Mobile (Expo) Analytics Exports ─────────────────────────────────

// Events
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
} from "./events";

// Provider
export { TimeoAnalyticsProvider } from "./provider";
export type { TimeoAnalyticsProviderProps } from "./provider";

// Hooks
export { usePostHog, useTrackEvent, useFeatureFlag } from "./hooks";

// Identify
export { identifyUser, resetUser } from "./identify";
export type { IdentifyUserProps } from "./identify";

// Groups
export { setTenantGroup } from "./groups";
export type { TenantGroupProps } from "./groups";
