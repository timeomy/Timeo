/**
 * Typed PostHog event definitions for Timeo.
 *
 * Each event has a name and a strongly-typed properties object so that
 * tracking calls are consistent across mobile and web.
 */

// ─── Booking Events ──────────────────────────────────────────────────────────

export interface BookingCreatedProps {
  booking_id: string;
  service_id: string;
  service_name: string;
  staff_id?: string;
  price: number;
  currency: string;
  tenant_id: string;
}

export interface BookingCancelledProps {
  booking_id: string;
  service_id: string;
  tenant_id: string;
  reason?: string;
}

export interface BookingCompletedProps {
  booking_id: string;
  service_id: string;
  service_name: string;
  price: number;
  currency: string;
  tenant_id: string;
}

// ─── Order / Commerce Events ─────────────────────────────────────────────────

export interface ProductViewedProps {
  product_id: string;
  product_name: string;
  price: number;
  currency: string;
  tenant_id: string;
}

export interface AddToCartProps {
  product_id: string;
  product_name: string;
  price: number;
  currency: string;
  quantity: number;
  tenant_id: string;
}

export interface CheckoutStartedProps {
  order_total: number;
  currency: string;
  item_count: number;
  tenant_id: string;
}

export interface OrderPlacedProps {
  order_id: string;
  order_total: number;
  currency: string;
  item_count: number;
  tenant_id: string;
}

export interface PaymentCompletedProps {
  order_id: string;
  amount: number;
  currency: string;
  payment_method?: string;
  tenant_id: string;
}

// ─── Browse / Discovery Events ───────────────────────────────────────────────

export interface ServiceViewedProps {
  service_id: string;
  service_name: string;
  price: number;
  currency: string;
  duration_minutes: number;
  tenant_id: string;
}

export interface ServiceListViewedProps {
  tenant_id: string;
  count: number;
}

export interface ProductListViewedProps {
  tenant_id: string;
  count: number;
}

// ─── Auth / Tenant Events ────────────────────────────────────────────────────

export interface SignedInProps {
  method: string;
}

export interface SignedUpProps {
  method: string;
}

export interface TenantSwitchedProps {
  from_tenant_id?: string;
  to_tenant_id: string;
  tenant_name: string;
}

// ─── Event Map ───────────────────────────────────────────────────────────────

export interface TimeoEventMap {
  // Booking funnel
  service_viewed: ServiceViewedProps;
  service_list_viewed: ServiceListViewedProps;
  booking_created: BookingCreatedProps;
  booking_cancelled: BookingCancelledProps;
  booking_completed: BookingCompletedProps;

  // Commerce funnel
  product_viewed: ProductViewedProps;
  product_list_viewed: ProductListViewedProps;
  add_to_cart: AddToCartProps;
  checkout_started: CheckoutStartedProps;
  order_placed: OrderPlacedProps;
  payment_completed: PaymentCompletedProps;

  // Auth
  signed_in: SignedInProps;
  signed_up: SignedUpProps;
  tenant_switched: TenantSwitchedProps;
}

export type TimeoEvent = keyof TimeoEventMap;
