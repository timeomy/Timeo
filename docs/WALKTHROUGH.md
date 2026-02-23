# Timeo Platform Walkthrough

A comprehensive guide to every user role and workflow in Timeo — a multi-tenant SaaS platform for bookings, commerce, and fitness operations targeting the Malaysian market.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [Admin Journey](#admin-journey)
5. [Staff Journey](#staff-journey)
6. [Customer Journey](#customer-journey)
7. [Platform Admin Journey](#platform-admin-journey)
8. [Platform Operations](#platform-operations)
9. [Troubleshooting](#troubleshooting)
10. [Glossary](#glossary)

---

## Overview

Timeo is a multi-tenant SaaS platform built for Malaysian service businesses — salons, gyms, wellness centers, and retail shops. Each business (tenant) gets its own isolated environment with:

- **Booking engine** — services, staff availability, time-slot selection
- **Commerce** — products, shopping cart, order management
- **Point of Sale (POS)** — in-person transactions with cash, card, QR pay, and bank transfer
- **Fitness tools** — check-ins (QR/NFC/manual), session packages and credits, session logs with exercises and body metrics
- **Membership & loyalty** — membership plans, vouchers, gift cards
- **Analytics** — revenue, bookings, orders, customer insights, staff performance
- **e-Invoice** — Malaysia LHDN MyInvois integration
- **Payments** — Stripe Connect with per-tenant connected accounts

### Architecture at a Glance

| Layer | Technology |
|-------|-----------|
| Mobile apps (4) | Expo SDK 54+, React Native, expo-router, NativeWind |
| Web app | Next.js 14 (App Router), Tailwind, shadcn/ui |
| Backend & DB | Convex (real-time, serverless) |
| Auth | Better Auth with RBAC |
| Payments | Stripe (Connect, subscriptions, POS) |
| Notifications | Novu |
| Analytics | PostHog |

### Apps

| App | Target User | Package |
|-----|-------------|---------|
| **Customer** | End customers | `apps/customer/` |
| **Staff** | Business employees | `apps/staff/` |
| **Admin** | Business owners/managers | `apps/admin/` |
| **Platform** | Timeo super-admins | `apps/platform/` |
| **Web** | All users (browser) | `apps/web/` |

---

## Getting Started

### Authentication

All mobile apps share the same auth flow from `packages/auth/`:

1. **Sign Up** — `SignUpScreen`: Enter name, email, and password. Creates account via Better Auth (`authClient.signUp.email`).
2. **Sign In** — `SignInScreen`: Enter email and password. Authenticates via Better Auth (`authClient.signIn.email`).
3. **Tenant Selection** — `TenantSelectScreen`: After authentication, if the user belongs to multiple organizations, they pick which one to enter. Shows each tenant's name, the user's role within it, and an "Active" badge for the current selection.

The auth screens use a dark theme (`#0B0B0F` background) with gold accent (`#FFB300`).

### Role-Based Access

Each app enforces role requirements at the layout level:

| App | Guard | Minimum Role |
|-----|-------|-------------|
| Admin | `AuthGuard` → `TenantAndRoleGate` | `admin` |
| Staff | `AuthGuard` → `RoleGuard` | `staff` |
| Customer | `AuthGuard` → `TenantGuard` | `customer` |
| Platform | `AuthGuard` → `RoleGuard` | `platform_admin` |

If a user lacks the required role, they see a restricted-access message. If they have no tenant memberships, they're redirected to onboarding (admin) or shown a "No Organization Yet" state (staff).

---

## User Roles

Timeo uses a strict role hierarchy where higher roles inherit all permissions of lower roles:

```
platform_admin  →  Full system control
    ↓
  admin         →  Tenant owner/manager
    ↓
  staff         →  Business employee
    ↓
 customer       →  End user / client
```

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Customer** | Browse services/products, book appointments, place orders, manage profile, check-in via QR, check gift card balances | Manage business settings, view analytics, process POS |
| **Staff** | Everything a customer can do, plus: manage bookings, process orders, run POS transactions, check in members, log sessions, manage schedule | Change business settings, view full analytics, manage memberships/vouchers |
| **Admin** | Everything staff can do, plus: full analytics, business settings, Stripe Connect setup, staff management, services/products CRUD, memberships, vouchers, gift cards, branding | Platform-level operations |
| **Platform Admin** | Everything admin can do, plus: manage all tenants, system configuration, feature flags, platform-wide analytics | N/A — highest role |

---

## Admin Journey

The Admin app (`apps/admin/`) is for business owners and managers who need full control over their tenant.

### Onboarding — Creating a Business

**Screen**: `app/onboarding.tsx`

When an admin first signs in with no existing tenant:

1. Enter a **business name** (e.g., "FitZone KL")
2. A **slug** is auto-generated from the name (e.g., `fitzone-kl`)
3. Preview the tenant URL: `timeo.my/fitzone-kl`
4. Tap **Create Business** — calls `api.tenants.createForOnboarding`
5. Redirected to the main dashboard

### Dashboard

**Screen**: `app/(tabs)/index.tsx` — Tab: **Dashboard**

The admin dashboard provides a quick business health overview:

- **Period selector** — toggle between Day, Week, Month, Year views
- **Revenue card** — total revenue in RM with percentage change vs. previous period
- **Booking stats** — total bookings, completion rate, average bookings per day
- **Revenue chart** — bar chart of revenue over the selected period
- **Top services** — ranked list of highest-earning services
- **View Full Analytics** link — navigates to the detailed analytics screen

### Services Management

**Screen**: `app/(tabs)/services.tsx` — Tab: **Services**

Manage the services your business offers (e.g., haircut, massage, personal training):

- **Search** services by name
- **Create** a new service: tap the `+` button → fill in name, description, duration (minutes), price (RM)
- **Edit** an existing service: tap the pencil icon → modify fields in the modal
- **Toggle active/inactive**: tap the toggle switch on any service card
- Prices are stored in cents internally, displayed as RM (e.g., `RM 50.00`)

### Products Management

**Screen**: `app/(tabs)/products.tsx` — Tab: **Products**

Manage physical or digital products for sale:

- **Search** products by name
- **Create** a new product: tap `+` → fill in name, description, price (RM), image URL
- **Edit** an existing product: tap the pencil icon
- **Toggle active/inactive**: tap the toggle switch

### Staff Management

**Screen**: `app/(tabs)/staff.tsx` — Tab: **Staff**

View and manage team members:

- **Search** by name or email
- **Filter by role** — All, Admin, Staff, Customer
- Each member card shows: name, email, role badge, status badge
- **Tap a member** → navigate to staff detail screen (`staff/[id]`)
- **Invite** new staff: tap the invite button → navigate to `staff/invite`

### Settings

**Screen**: `app/(tabs)/settings.tsx` — Tab: **Settings**

Comprehensive business configuration with expandable sections:

#### Quick Links
Shortcuts to frequently used screens:
- Customer Directory
- Membership Plans
- Payment History
- Gift Cards
- e-Invoice
- Vouchers

#### Stripe Connect
Set up payment processing for your business:
- Shows connection status (Connected / Not Connected)
- **Connect Stripe Account** button → initiates Stripe Connect onboarding
- Once connected, shows the Stripe account ID

#### Business Information
- **Business Name** — editable text field
- **Slug** — URL-safe identifier (auto-generated, editable)
- **Display Name** — public-facing name

#### Branding
- **Logo** — upload/change business logo (image picker)
- **Primary Color** — hex color picker for brand accent color

#### Business Hours
Configure operating hours for each day of the week:
- Toggle each day open/closed
- Set opening and closing times
- Used by the booking engine to determine available slots

#### Notifications
Configure notification preferences:
- **Email**: booking confirmations, booking reminders, order updates
- **Push notifications**: enable/disable
- **In-app notifications**: enable/disable

#### Sign Out
Log out of the admin account.

### Analytics (Full)

**Screen**: `app/analytics/index.tsx`

Deep-dive analytics with multiple sections:

- **Revenue** — total revenue, breakdown by bookings vs. orders, daily revenue chart
- **Bookings** — total count, completion rate (ring chart), breakdown by status, daily chart, peak hours analysis
- **Orders** — total count, average order value, breakdown by status
- **Top Services** — table with service name, bookings count, revenue
- **Top Products** — table with product name, orders count, revenue
- **Customer Insights** — total customers, new vs. returning, top customers by spend
- **Staff Performance** — metrics per staff member

### Gift Cards

**Screen**: `app/gift-cards/index.tsx`

Manage gift cards issued by the business:

- **Filter by status** — All, Active, Depleted, Expired, Cancelled
- Each card shows: code, status badge, sender ("from"), recipient ("to"), remaining balance in RM
- **Issue New Gift Card** button → navigate to creation screen

### Membership Plans

**Screen**: `app/memberships/index.tsx`

Create and manage subscription-based membership plans:

- Each plan shows: name, description, price (RM), billing interval (monthly/yearly), feature list
- **Toggle active/inactive** per plan
- **Create/edit** plans via navigation

### Vouchers

**Screen**: `app/vouchers/index.tsx`

Manage promotional vouchers:

- **Filter** — Active only or All
- Voucher types: **percentage** discount, **fixed** amount off, **free_session**
- Each voucher shows: code, type badge, discount value, source/partner, usage count, expiry date
- Create and manage vouchers via navigation

---

## Staff Journey

The Staff app (`apps/staff/`) is for business employees who handle day-to-day operations.

### Dashboard

**Screen**: `app/(tabs)/_layout.tsx`

After sign-in, staff see the tab navigation with four main sections. If the staff member has no tenant memberships, a "No Organization Yet" placeholder is shown.

### Booking Management

**Screen**: `app/(tabs)/bookings.tsx` — Tab: **Bookings**

Manage customer appointments:

- **Search** bookings by customer name or service
- **Status tabs** — All, Pending, Confirmed, Completed, Cancelled
- Each booking card displays: customer name, service, date/time, status badge
- **Actions** (based on current status):
  - Pending → **Confirm** or **Cancel**
  - Confirmed → **Complete** or **Cancel**
  - Completed/Cancelled → no actions (view only)

Typical booking lifecycle:
```
Pending → Confirmed → Completed
   ↓          ↓
 Cancelled  Cancelled
```

### Order Management

**Screen**: `app/(tabs)/orders.tsx` — Tab: **Orders**

Process customer product orders:

- **Search** orders by customer name
- **Status tabs** — All, Pending, Confirmed, Preparing, Ready, Completed
- **Status progression** — advance orders through the fulfillment pipeline:

```
Pending → Confirmed → Preparing → Ready → Completed
   ↓         ↓           ↓         ↓
 Cancelled Cancelled  Cancelled  Cancelled
```

Each status transition updates the order in real-time via Convex.

### Product Management

**Screen**: `app/(tabs)/products.tsx` — Tab: **Products**

Staff can also manage the product catalog:

- **Search** products
- **Toggle active/inactive**
- **Create new** product via the floating action button (FAB)

### Point of Sale (POS)

#### Transaction List
**Screen**: `app/pos/index.tsx`

View all POS transactions with a daily financial summary:

- **Daily stats** — total transactions, total revenue, total discounts, voided amount
- **Transaction cards** — receipt number, customer name, date/time, total (RM), payment method badge, status badge
- **New Transaction** via FAB

#### New Transaction
**Screen**: `app/pos/new.tsx`

Create an in-person sale:

1. **Select customer** — search and pick from tenant members (optional)
2. **Add line items** — each item has:
   - Type: `membership`, `session_package`, `service`, or `product`
   - Name, unit price, quantity
3. **Choose payment method** — Cash, Card, QR Pay, or Bank Transfer
4. **Apply voucher** (optional) — enter a voucher code, real-time validation shows discount
5. **Add notes** (optional)
6. **Review summary** — subtotal, discount amount, final total
7. **Complete Transaction** — creates the POS record

### Check-Ins

**Screen**: `app/check-ins/index.tsx`

Track member visits to the business:

- **Stats dashboard** — today's check-ins, this week's total, QR check-ins count, manual check-ins count
- **Action buttons**:
  - **Scan QR** — navigate to QR scanner screen (`check-ins/scan`)
  - **Manual Check-in** — opens a modal to search and select a member
- **Today's check-ins list** — member name, check-in time, method badge (QR/NFC/manual)

### Session Logs

#### List
**Screen**: `app/session-logs/index.tsx`

View all recorded training/consultation sessions:

- **Search** by client name or coach name
- Each card shows: client name, session type badge, coach name, date, exercise count

#### Create Session Log
**Screen**: `app/session-logs/create.tsx`

Record a new session with detailed tracking:

1. **Select client** — search from tenant members
2. **Session type** — Personal Training, Group Class, Assessment, or Consultation
3. **Link session credit** (optional) — deduct from client's purchased session package
4. **Exercises** — add multiple exercises, each with:
   - Exercise name
   - Sets, reps, weight (kg)
5. **Body metrics** (optional):
   - Weight (kg)
   - Body fat (%)
   - Heart rate (bpm)
   - Blood pressure (sys/dia)
6. **Notes** — free-text observations
7. **Save** — creates the session log record

### Schedule Management

**Screen**: `app/schedule/index.tsx`

Manage the staff member's weekly schedule:

- **Week navigation** — previous/next week arrows
- **Daily view** — shows bookings and blocked slots for each day
- **Block time** — tap "Block Time" to create an unavailable period:
  - Select date
  - Set start and end time
  - Add a reason (e.g., "Lunch break", "Training")
- **Delete** blocked slots when no longer needed

### Gift Card Redemption

**Screen**: `app/gift-cards/redeem.tsx`

Staff can redeem gift cards during transactions by entering the gift card code.

---

## Customer Journey

The Customer app (`apps/customer/`) is for end users who book services, buy products, and manage their accounts.

### Home Screen

**Screen**: `app/(tabs)/index.tsx` — Tab: **Home**

The landing screen after sign-in:

- **Welcome banner** with the tenant's branding (logo, colors)
- **"Book Now" CTA** — prominent call-to-action button
- **Services carousel** — horizontal scroll of available services with name, duration, price
- **Product grid** — browse products with "Add to Cart" buttons

### Browsing Services

**Screen**: `app/(tabs)/index.tsx` → services carousel

Customers can browse available services directly from the home screen. Each service card shows the service name, duration, and price in RM. Tapping a service navigates to the service detail and booking flow.

### Service Detail & Booking

**Screen**: `app/services/[id].tsx`

Complete booking flow in a single screen:

1. **Service info** — name, description, duration, price in RM
2. **Select date** — horizontal date picker showing the next 14 days
3. **Choose time slot** — available slots grouped by time of day, showing which staff members are available
4. **Select staff** — if multiple staff are available for a slot, pick your preferred one
5. **Book Now** — sticky bottom button to confirm the booking
6. **Confirmation** — success state with booking details; tracked via PostHog analytics

### Browsing Products

**Screen**: `app/(tabs)/products.tsx` — Tab: **Products**

Browse and shop the product catalog:

- **Search** products by name
- **2-column grid** layout with product cards
- Each card shows: image, name, price (RM), "Add to Cart" button
- Tapping a product navigates to `products/[id]` for full details

### Shopping Cart & Checkout

**Screen**: `app/cart.tsx`

Review and complete product purchases:

- **Cart items** — list with product image, name, quantity selector (increment/decrement), remove button
- **Cart summary** — subtotal and total in RM
- **Checkout** — tap to create an order via `api.orders.create`
- **Success state** — order confirmed with details

### Profile & Account

**Screen**: `app/(tabs)/profile.tsx` — Tab: **Profile**

Manage personal info and access all features:

- **Avatar** — upload or change profile photo
- **Account info** — name, email display

#### Quick Actions
A grid of shortcuts to key features:

| Action | Description |
|--------|-------------|
| **My QR Code** | Display QR code for check-in |
| **My Bookings** | View booking history |
| **My Sessions** | View session log history |
| **My Vouchers** | View available vouchers |
| **My Packages** | View session packages and credits |
| **Cart** | Shopping cart (shows item count badge) |
| **Notifications** | View notifications |
| **Gift Cards** | Check gift card balances |
| **Receipts** | View payment receipts |

#### Organization Switcher
If the customer belongs to multiple tenants, switch between them.

#### Sign Out
Log out of the customer account.

### QR Code for Check-In

**Screen**: `app/qr-code/index.tsx`

Display your member QR code for scanning at the business:

- **Member info** — name and membership details
- **QR code** — large, scannable code (generated via `react-native-qrcode-svg`)
- **Generate/Regenerate** — create a new QR code if needed
- **Brightness tip** — reminder to increase screen brightness for reliable scanning
- **Recent check-ins** — list of your recent check-in history

### Gift Card Balance

**Screen**: `app/gift-cards/index.tsx`

Check the balance on a gift card:

1. Enter the **gift card code**
2. Tap **Check Balance**
3. See the remaining balance in RM, or an "Invalid code" message

---

## Platform Admin Journey

The Platform app (`apps/platform/`) is for Timeo super-administrators who manage the entire platform.

### Dashboard

**Screen**: `app/(tabs)/index.tsx` — Tab: **Dashboard**

Platform-wide overview with:

- **Key metrics** — total tenants, total users, total bookings, total revenue (RM), total orders, active tenants
- **Tenant plan distribution** — breakdown of tenants by subscription plan
- **Monthly growth** — growth metrics over time
- **Top tenants by revenue** — ranked list of highest-earning businesses
- **Top tenants by bookings** — ranked list of most-booked businesses
- **Quick actions** — shortcuts to create a new tenant or manage feature flags
- **Recent tenants** — latest businesses added to the platform
- **Audit log link** — navigate to platform-wide audit trail

### Tenant Management

**Screen**: `app/(tabs)/tenants.tsx` — Tab: **Tenants**

Manage all businesses on the platform:

- **Search** tenants by name
- Each tenant card shows: name, slug, subscription plan badge, status badge, creation date
- **Create new tenant** — button to add a new business

### Feature Flags

**Screen**: `app/(tabs)/_layout.tsx` — Tab: **Flags**

Toggle features on/off across the platform. Feature flags allow gradual rollout of new functionality or A/B testing.

### System Configuration

**Screen**: `app/(tabs)/config.tsx` — Tab: **Config**

Manage platform-wide settings as key-value pairs:

| Key | Purpose |
|-----|---------|
| `platform.name` | Platform display name |
| `support_email` | Support contact email |
| `maintenance_mode` | Enable/disable maintenance mode |
| `max_tenants` | Maximum allowed tenants |
| `default_plan` | Default subscription plan for new tenants |
| `default_timezone` | Platform default timezone |
| `signup_enabled` | Allow new user registrations |
| `webhook_secret` | Webhook signing secret |

- Edit existing config values (stored as JSON)
- Add new configuration entries
- Changes take effect platform-wide

---

## Platform Operations

### Multi-Tenancy Model

Every piece of business data in Timeo is scoped to a tenant via `tenantId`. This ensures complete data isolation:

- Users can belong to multiple tenants via `tenantMemberships`
- Each membership has a role (`admin`, `staff`, `customer`)
- Tenant slugs provide URL-based routing (`timeo.my/{slug}`)

### Data Flow

```
User signs in
    → Better Auth validates credentials
    → Fetch tenant memberships
    → User selects tenant (if multiple)
    → TenantGuard / RoleGuard enforces access
    → All queries/mutations scoped to tenantId
```

### Audit Trail

All mutations are tracked in the `auditLogs` table, providing a complete history of actions across the platform. Platform admins can review these logs for compliance and troubleshooting.

### Payment Processing

Timeo uses Stripe Connect to enable per-tenant payment processing:

1. **Admin connects Stripe** — via Settings → Stripe Connect
2. **Online payments** — Stripe PaymentIntents for booking/order payments
3. **POS payments** — Cash, card, QR pay, bank transfer recorded in `posTransactions`
4. **Subscriptions** — Recurring membership billing via Stripe Subscriptions

### Notification System

Powered by Novu (`packages/notifications/`):

- **Push notifications** — via Expo push tokens stored in `pushTokens` table
- **Email notifications** — booking confirmations, reminders, order updates
- **In-app notifications** — stored in `notifications` table
- Configurable per-tenant via notification preferences

### e-Invoice (Malaysia)

Integration with Malaysia's LHDN MyInvois system:

- e-Invoice requests stored in `eInvoiceRequests` table
- Accessible from Admin → Settings → Quick Links → e-Invoice
- Supports Malaysian tax compliance requirements

---

## Troubleshooting

### "No Organization Yet" Screen

**Cause**: The signed-in user has no `tenantMembership` records.

**Fix**:
- **Admin app**: Redirects to onboarding to create a new business
- **Staff app**: Ask an admin to invite you to their organization
- **Customer app**: Join a business via invite or public sign-up

### Cannot Access a Tab or Screen

**Cause**: Role guard is blocking access.

**Fix**: Verify the user's role in `tenantMemberships` meets the minimum requirement for that app (see [Role-Based Access](#role-based-access)).

### Booking Slots Not Showing

**Cause**: Business hours not configured, or staff availability not set.

**Fix**:
1. Admin → Settings → Business Hours → enable and set times for each day
2. Ensure at least one staff member has availability for the service
3. Check for blocked slots that may overlap

### Stripe Not Connected

**Cause**: Tenant hasn't completed Stripe Connect onboarding.

**Fix**: Admin → Settings → Stripe Connect → tap "Connect Stripe Account" and complete the Stripe onboarding flow.

### QR Code Not Scanning

**Cause**: Screen brightness too low, or QR code expired.

**Fix**:
1. Increase screen brightness to maximum
2. Regenerate the QR code from the QR Code screen
3. Ensure the staff scanner has camera permissions

### POS Voucher Not Applying

**Cause**: Voucher may be expired, fully redeemed, or not applicable.

**Fix**:
1. Check voucher expiry date in Admin → Vouchers
2. Verify usage count hasn't exceeded the limit
3. Ensure the voucher type matches the transaction items

---

## Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | A business/organization on the Timeo platform. Each tenant is fully isolated. |
| **Slug** | URL-safe identifier for a tenant (e.g., `fitzone-kl` in `timeo.my/fitzone-kl`). |
| **RBAC** | Role-Based Access Control — permissions determined by user role within a tenant. |
| **POS** | Point of Sale — in-person transaction processing for walk-in customers. |
| **Session Package** | A bundle of training sessions a customer can purchase (e.g., "10 PT Sessions"). |
| **Session Credit** | A single session from a package; consumed when a session log is created. |
| **Check-In** | Recording a member's visit via QR code scan, NFC tap, or manual entry. |
| **Blocked Slot** | A time period marked as unavailable on a staff member's schedule. |
| **Stripe Connect** | Stripe's platform for enabling payments on behalf of connected business accounts. |
| **Convex** | Real-time serverless backend — handles database, mutations, queries, and actions. |
| **Better Auth** | Authentication library used for email/password auth with session management. |
| **NativeWind** | Tailwind CSS for React Native — used for styling across all mobile apps. |
| **Novu** | Notification infrastructure — handles push, email, and in-app notifications. |
| **PostHog** | Analytics platform — tracks user events and product metrics. |
| **MyInvois** | Malaysia's LHDN e-Invoice system for tax-compliant electronic invoicing. |
| **Voucher** | A promotional code offering a discount (percentage, fixed amount, or free session). |
| **Gift Card** | A prepaid card with a balance that can be redeemed at the business. |
| **Feature Flag** | A toggle to enable/disable platform features without code deployment. |
| **Audit Log** | A record of all data mutations for compliance and troubleshooting. |
| **MYR / RM** | Malaysian Ringgit — the currency used throughout Timeo. |

---

*This guide covers Timeo as of the current codebase. Screens and workflows may evolve as the platform develops.*
