/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_clerkSync from "../actions/clerkSync.js";
import type * as actions_notifications from "../actions/notifications.js";
import type * as actions_novuSync from "../actions/novuSync.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as bookingEvents from "../bookingEvents.js";
import type * as bookings from "../bookings.js";
import type * as checkIns from "../checkIns.js";
import type * as crons from "../crons.js";
import type * as eInvoice from "../eInvoice.js";
import type * as files from "../files.js";
import type * as giftCards from "../giftCards.js";
import type * as http from "../http.js";
import type * as lib_analyticsHelpers from "../lib/analyticsHelpers.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_middleware from "../lib/middleware.js";
import type * as memberships from "../memberships.js";
import type * as notifications from "../notifications.js";
import type * as orderItems from "../orderItems.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as platform from "../platform.js";
import type * as pos from "../pos.js";
import type * as products from "../products.js";
import type * as scheduling from "../scheduling.js";
import type * as seed from "../seed.js";
import type * as services from "../services.js";
import type * as sessionCredits from "../sessionCredits.js";
import type * as sessionLogs from "../sessionLogs.js";
import type * as sessionPackages from "../sessionPackages.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as tenantMemberships from "../tenantMemberships.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as vouchers from "../vouchers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/clerkSync": typeof actions_clerkSync;
  "actions/notifications": typeof actions_notifications;
  "actions/novuSync": typeof actions_novuSync;
  analytics: typeof analytics;
  auth: typeof auth;
  bookingEvents: typeof bookingEvents;
  bookings: typeof bookings;
  checkIns: typeof checkIns;
  crons: typeof crons;
  eInvoice: typeof eInvoice;
  files: typeof files;
  giftCards: typeof giftCards;
  http: typeof http;
  "lib/analyticsHelpers": typeof lib_analyticsHelpers;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/helpers": typeof lib_helpers;
  "lib/middleware": typeof lib_middleware;
  memberships: typeof memberships;
  notifications: typeof notifications;
  orderItems: typeof orderItems;
  orders: typeof orders;
  payments: typeof payments;
  platform: typeof platform;
  pos: typeof pos;
  products: typeof products;
  scheduling: typeof scheduling;
  seed: typeof seed;
  services: typeof services;
  sessionCredits: typeof sessionCredits;
  sessionLogs: typeof sessionLogs;
  sessionPackages: typeof sessionPackages;
  stripeWebhook: typeof stripeWebhook;
  tenantMemberships: typeof tenantMemberships;
  tenants: typeof tenants;
  users: typeof users;
  validators: typeof validators;
  vouchers: typeof vouchers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
