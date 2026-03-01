import { relations } from "drizzle-orm";
import {
  users,
  tenants,
  tenantMemberships,
  services,
  bookings,
  bookingEvents,
  staffAvailability,
  businessHours,
  blockedSlots,
  products,
  orders,
  orderItems,
  memberships,
  payments,
  subscriptions,
  stripeAccounts,
  posTransactions,
  checkIns,
  memberQrCodes,
  sessionPackages,
  sessionCredits,
  sessionLogs,
  vouchers,
  voucherRedemptions,
  giftCards,
  giftCardTransactions,
  notifications,
  notificationPreferences,
  pushTokens,
  platformConfig,
  featureFlags,
  auditLogs,
  files,
  eInvoiceRequests,
} from "./schema/index";

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  ownedTenants: many(tenants),
  memberships: many(tenantMemberships),
  bookingsAsCustomer: many(bookings),
  ordersAsCustomer: many(orders),
  notifications: many(notifications),
  pushTokens: many(pushTokens),
  checkIns: many(checkIns),
  sessionCredits: many(sessionCredits),
  auditLogs: many(auditLogs),
  files: many(files),
}));

// ─── Tenants ─────────────────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, {
    fields: [tenants.owner_id],
    references: [users.id],
  }),
  memberships: many(tenantMemberships),
  services: many(services),
  bookings: many(bookings),
  products: many(products),
  orders: many(orders),
  membershipPlans: many(memberships),
  payments: many(payments),
  subscriptions: many(subscriptions),
  stripeAccounts: many(stripeAccounts),
  posTransactions: many(posTransactions),
  checkIns: many(checkIns),
  sessionPackages: many(sessionPackages),
  vouchers: many(vouchers),
  giftCards: many(giftCards),
  notifications: many(notifications),
  businessHours: many(businessHours),
  staffAvailability: many(staffAvailability),
  blockedSlots: many(blockedSlots),
  featureFlags: many(featureFlags),
  auditLogs: many(auditLogs),
  files: many(files),
  eInvoiceRequests: many(eInvoiceRequests),
}));

// ─── Tenant Memberships ──────────────────────────────────────────────────────
export const tenantMembershipsRelations = relations(
  tenantMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [tenantMemberships.user_id],
      references: [users.id],
    }),
    tenant: one(tenants, {
      fields: [tenantMemberships.tenant_id],
      references: [tenants.id],
    }),
  }),
);

// ─── Services ────────────────────────────────────────────────────────────────
export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [services.tenant_id],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [services.created_by],
    references: [users.id],
  }),
  bookings: many(bookings),
  sessionPackages: many(sessionPackages),
}));

// ─── Bookings ────────────────────────────────────────────────────────────────
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [bookings.tenant_id],
    references: [tenants.id],
  }),
  customer: one(users, {
    fields: [bookings.customer_id],
    references: [users.id],
    relationName: "bookingCustomer",
  }),
  service: one(services, {
    fields: [bookings.service_id],
    references: [services.id],
  }),
  staff: one(users, {
    fields: [bookings.staff_id],
    references: [users.id],
    relationName: "bookingStaff",
  }),
  events: many(bookingEvents),
  payments: many(payments),
  sessionLogs: many(sessionLogs),
}));

// ─── Booking Events ──────────────────────────────────────────────────────────
export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingEvents.booking_id],
    references: [bookings.id],
  }),
  actor: one(users, {
    fields: [bookingEvents.actor_id],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [bookingEvents.tenant_id],
    references: [tenants.id],
  }),
}));

// ─── Staff Availability ──────────────────────────────────────────────────────
export const staffAvailabilityRelations = relations(
  staffAvailability,
  ({ one }) => ({
    staff: one(users, {
      fields: [staffAvailability.staff_id],
      references: [users.id],
    }),
    tenant: one(tenants, {
      fields: [staffAvailability.tenant_id],
      references: [tenants.id],
    }),
  }),
);

// ─── Business Hours ──────────────────────────────────────────────────────────
export const businessHoursRelations = relations(businessHours, ({ one }) => ({
  tenant: one(tenants, {
    fields: [businessHours.tenant_id],
    references: [tenants.id],
  }),
}));

// ─── Blocked Slots ───────────────────────────────────────────────────────────
export const blockedSlotsRelations = relations(blockedSlots, ({ one }) => ({
  tenant: one(tenants, {
    fields: [blockedSlots.tenant_id],
    references: [tenants.id],
  }),
  staff: one(users, {
    fields: [blockedSlots.staff_id],
    references: [users.id],
    relationName: "blockedSlotStaff",
  }),
  createdByUser: one(users, {
    fields: [blockedSlots.created_by],
    references: [users.id],
    relationName: "blockedSlotCreator",
  }),
}));

// ─── Products ────────────────────────────────────────────────────────────────
export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenant_id],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [products.created_by],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenant_id],
    references: [tenants.id],
  }),
  customer: one(users, {
    fields: [orders.customer_id],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

// ─── Order Items ─────────────────────────────────────────────────────────────
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
}));

// ─── Memberships ─────────────────────────────────────────────────────────────
export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [memberships.tenant_id],
    references: [tenants.id],
  }),
  subscriptions: many(subscriptions),
}));

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenant_id],
    references: [tenants.id],
  }),
  customer: one(users, {
    fields: [payments.customer_id],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [payments.order_id],
    references: [orders.id],
  }),
  booking: one(bookings, {
    fields: [payments.booking_id],
    references: [bookings.id],
  }),
}));

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenant_id],
    references: [tenants.id],
  }),
  customer: one(users, {
    fields: [subscriptions.customer_id],
    references: [users.id],
  }),
  membership: one(memberships, {
    fields: [subscriptions.membership_id],
    references: [memberships.id],
  }),
}));

// ─── Stripe Accounts ─────────────────────────────────────────────────────────
export const stripeAccountsRelations = relations(stripeAccounts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stripeAccounts.tenant_id],
    references: [tenants.id],
  }),
}));

// ─── POS Transactions ────────────────────────────────────────────────────────
export const posTransactionsRelations = relations(
  posTransactions,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [posTransactions.tenant_id],
      references: [tenants.id],
    }),
    customer: one(users, {
      fields: [posTransactions.customer_id],
      references: [users.id],
      relationName: "posTransactionCustomer",
    }),
    staff: one(users, {
      fields: [posTransactions.staff_id],
      references: [users.id],
      relationName: "posTransactionStaff",
    }),
    voucher: one(vouchers, {
      fields: [posTransactions.voucher_id],
      references: [vouchers.id],
    }),
    eInvoiceRequests: many(eInvoiceRequests),
  }),
);

// ─── Check-ins ───────────────────────────────────────────────────────────────
export const checkInsRelations = relations(checkIns, ({ one }) => ({
  tenant: one(tenants, {
    fields: [checkIns.tenant_id],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [checkIns.user_id],
    references: [users.id],
    relationName: "checkInUser",
  }),
  checkedInByUser: one(users, {
    fields: [checkIns.checked_in_by],
    references: [users.id],
    relationName: "checkInStaff",
  }),
}));

// ─── Member QR Codes ─────────────────────────────────────────────────────────
export const memberQrCodesRelations = relations(memberQrCodes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [memberQrCodes.tenant_id],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [memberQrCodes.user_id],
    references: [users.id],
  }),
}));

// ─── Session Packages ────────────────────────────────────────────────────────
export const sessionPackagesRelations = relations(
  sessionPackages,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [sessionPackages.tenant_id],
      references: [tenants.id],
    }),
    service: one(services, {
      fields: [sessionPackages.service_id],
      references: [services.id],
    }),
    credits: many(sessionCredits),
  }),
);

// ─── Session Credits ─────────────────────────────────────────────────────────
export const sessionCreditsRelations = relations(
  sessionCredits,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [sessionCredits.tenant_id],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [sessionCredits.user_id],
      references: [users.id],
    }),
    package: one(sessionPackages, {
      fields: [sessionCredits.package_id],
      references: [sessionPackages.id],
    }),
    sessionLogs: many(sessionLogs),
  }),
);

// ─── Session Logs ────────────────────────────────────────────────────────────
export const sessionLogsRelations = relations(sessionLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sessionLogs.tenant_id],
    references: [tenants.id],
  }),
  client: one(users, {
    fields: [sessionLogs.client_id],
    references: [users.id],
    relationName: "sessionLogClient",
  }),
  coach: one(users, {
    fields: [sessionLogs.coach_id],
    references: [users.id],
    relationName: "sessionLogCoach",
  }),
  booking: one(bookings, {
    fields: [sessionLogs.booking_id],
    references: [bookings.id],
  }),
  credit: one(sessionCredits, {
    fields: [sessionLogs.credit_id],
    references: [sessionCredits.id],
  }),
}));

// ─── Vouchers ────────────────────────────────────────────────────────────────
export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [vouchers.tenant_id],
    references: [tenants.id],
  }),
  redemptions: many(voucherRedemptions),
  posTransactions: many(posTransactions),
}));

// ─── Voucher Redemptions ─────────────────────────────────────────────────────
export const voucherRedemptionsRelations = relations(
  voucherRedemptions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [voucherRedemptions.tenant_id],
      references: [tenants.id],
    }),
    voucher: one(vouchers, {
      fields: [voucherRedemptions.voucher_id],
      references: [vouchers.id],
    }),
    user: one(users, {
      fields: [voucherRedemptions.user_id],
      references: [users.id],
    }),
  }),
);

// ─── Gift Cards ──────────────────────────────────────────────────────────────
export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [giftCards.tenant_id],
    references: [tenants.id],
  }),
  transactions: many(giftCardTransactions),
}));

// ─── Gift Card Transactions ──────────────────────────────────────────────────
export const giftCardTransactionsRelations = relations(
  giftCardTransactions,
  ({ one }) => ({
    giftCard: one(giftCards, {
      fields: [giftCardTransactions.gift_card_id],
      references: [giftCards.id],
    }),
    tenant: one(tenants, {
      fields: [giftCardTransactions.tenant_id],
      references: [tenants.id],
    }),
    createdByUser: one(users, {
      fields: [giftCardTransactions.created_by],
      references: [users.id],
    }),
  }),
);

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [notifications.tenant_id],
    references: [tenants.id],
  }),
}));

// ─── Notification Preferences ────────────────────────────────────────────────
export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.user_id],
      references: [users.id],
    }),
    tenant: one(tenants, {
      fields: [notificationPreferences.tenant_id],
      references: [tenants.id],
    }),
  }),
);

// ─── Push Tokens ─────────────────────────────────────────────────────────────
export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, {
    fields: [pushTokens.user_id],
    references: [users.id],
  }),
}));

// ─── Feature Flags ───────────────────────────────────────────────────────────
export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [featureFlags.tenant_id],
    references: [tenants.id],
  }),
}));

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenant_id],
    references: [tenants.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actor_id],
    references: [users.id],
  }),
}));

// ─── Files ───────────────────────────────────────────────────────────────────
export const filesRelations = relations(files, ({ one }) => ({
  tenant: one(tenants, {
    fields: [files.tenant_id],
    references: [tenants.id],
  }),
  uploadedByUser: one(users, {
    fields: [files.uploaded_by],
    references: [users.id],
  }),
}));

// ─── e-Invoice Requests ──────────────────────────────────────────────────────
export const eInvoiceRequestsRelations = relations(
  eInvoiceRequests,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [eInvoiceRequests.tenant_id],
      references: [tenants.id],
    }),
    transaction: one(posTransactions, {
      fields: [eInvoiceRequests.transaction_id],
      references: [posTransactions.id],
    }),
  }),
);
