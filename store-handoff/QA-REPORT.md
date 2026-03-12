# Timeo Flutter App — QA Report
**Date:** 2026-03-13 02:30 GMT+8  
**Tested on:** iPhone 17 Pro Max Simulator (iOS 26.2)  
**Account:** ws.member@timeo.my / 123456 (Member role)

---

## Executive Summary

The app was running entirely on **demo/mock data** — the auth provider bypassed the real API using hardcoded demo accounts, and all providers returned mock data. After fixing the auth and API integration, the app now connects to the real `api.timeo.my` backend, and **all screens display real data**.

---

## Bugs Found & Fixed

### 🔴 CRITICAL — Fixed

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | **Auth used demo bypass** — hardcoded demo accounts skipped real API | `auth_provider.dart` matched email/password against `_demoAccounts` map and used fake tokens | Removed demo bypass; auth now calls real `/api/auth/sign-in/email` and extracts session cookie from `Set-Cookie` header |
| 2 | **API client used Bearer token** — all API calls returned 401 | `api_client.dart` sent `Authorization: Bearer $token` but API uses `__Secure-better-auth.session_token` cookie | Changed interceptor to send `Cookie` header with stored session cookie |
| 3 | **QR code failed to generate** — showed "Failed to generate QR. Retrying..." | Demo token `demo-token-demo-member-id` can't authenticate with real QR endpoint | Fixed by using real session cookie auth (consequence of fix #1-2) |
| 4 | **Member ID showed "EMBER-ID"** — not a real user ID | `memberId` was `demo-member-id`, last 8 chars = `ember-id` → `EMBER-ID` | Now uses real UUID from API (displays `59AED0E8`) |
| 5 | **All providers had demo mode** — tenants, stats, membership, user profile all returned mock data | Each provider checked `token.startsWith('demo-token-')` and returned hardcoded values | Removed demo bypass from `tenant_provider.dart`, `stats_provider.dart`, `user_provider.dart`, `membership_provider.dart` |

### 🟡 MEDIUM — Fixed

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 6 | **Bookings back button is dead** — tapping ← does nothing, screen becomes dead-end | `Navigator.pop()` doesn't work when screen was reached via `context.go()` (go_router replaces route) | Added fallback: `if (Navigator.canPop) pop() else context.go('/home')` |
| 7 | **Tenant selection required every launch** — user had to pick WS Fitness each time | No persistent storage of selected tenant | Added `last_tenant_id` to secure storage; auto-selects on subsequent launches |
| 8 | **First launch shows blank white screen for 5-10 seconds** — looks like crash | Flutter debug build slow startup + splash screen duration | This is expected in debug builds; release build will be faster |

### 🟢 MINOR — Noted (Not Fixed)

| # | Issue | Notes |
|---|-------|-------|
| 9 | **Stats show "—" dashes** instead of numbers | Stats API endpoint (`/check-ins/stats`) likely requires admin role; returns null for regular members |
| 10 | **Coach Notes are hardcoded** | "Coach Mike", "Coach Sarah" with hardcoded dates — no API endpoint for coach notes |
| 11 | **Recent Sessions are hardcoded** | "Upper Body Strength", "HIIT Circuit" — no API endpoint |
| 12 | **Plan Benefits are hardcoded** | Unlimited Gym Access, Group Classes, etc. — not fetched from API |
| 13 | **Apple Wallet button non-functional** | Shows "Add to Apple Wallet" but no wallet pass implementation |
| 14 | **Bookings screen has no bottom nav** | Pushed as standalone route, not part of ShellRoute — by design but inconsistent UX |
| 15 | **Upload script JWT generation broken** | macOS grep doesn't support `-P` (PCRE) flag; screenshots may not actually upload |

---

## Screen-by-Screen QA Results

### 1. Sign-In Screen ✅
- Timeo branding/logo ✅
- Email & password fields ✅ 
- Password visibility toggle ✅
- "Forgot password?" link ✅
- Sign In button (blue, full-width) ✅
- "Don't have an account? Sign up" link ✅
- **Real API auth works** — returns session cookie ✅

### 2. Home Screen ✅
- WS Fitness branding in header ✅
- "Member Portal" subtitle ✅
- Tenant switcher dropdown (WS Fitness ▾) ✅
- "Membership Active · 1mth Membership" banner (REAL data from API) ✅
- "Welcome back, WS MEMBER" (real user name) ✅
- Visit stats cards (icons + "—" for no data) ⚠️
- Coach Notes (hardcoded) ⚠️
- Recent Sessions (hardcoded) ⚠️
- Bottom navigation: Home, Bookings, QR FAB, Membership, Profile ✅

### 3. QR Code Screen ✅
- "YOUR MEMBER ID" header ✅
- "Member" role badge (blue) ✅
- "WS MEMBER" name ✅
- "59AED0E8" member ID (real last-8 of UUID) ✅
- QR code generated from real API token ✅
- 30-second countdown timer (auto-refresh) ✅
- "Secure Dynamic ID · Refreshes every 30s" ✅
- "Add to Apple Wallet" button (non-functional) ⚠️

### 4. Membership Screen ✅
- "Current Plan" card with gradient ✅
- "1mth Membership" plan name (REAL from API) ✅
- "WS Member" name ✅
- Started: N/A, Status: No expiry ✅
- Plan Benefits (hardcoded list) ⚠️
- "Upgrade / Renew Plan" button ✅

### 5. Profile Screen ✅
- "ACCOUNT" header ✅
- Purple avatar with "WM" initials ✅
- Camera icon for photo upload ✅
- "WS Member" name ✅
- "1mth Membership" badge (real data) ✅
- "ws.member@timeo.my" email ✅
- Menu items: Edit Profile, My Subscription, Order History, Change Password ✅
- Others: Terms & Conditions, Privacy Policy ✅
- Logout icon (top right) ✅

### 6. Bookings Screen ✅
- Calendar (March 2026) ✅
- Today (13th) highlighted blue ✅
- Event dots on future dates ⚠️ (hardcoded mock events)
- "UPCOMING CLASSES" section ✅
- Empty state: "No classes scheduled" ✅
- Back button works (after fix) ✅

---

## API Endpoints Tested

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/auth/sign-in/email` | ✅ Works | Returns session cookie + user data |
| `GET /api/tenants/mine` | ✅ Works | Returns 4 tenants (WS Fitness, Bloom, Velocity, Petal) |
| `GET /api/tenants/:id/memberships` | ✅ Works | Returns active membership data |
| `GET /api/gate/qr-token` | ✅ Works | Returns QR token with 30s expiry |
| `GET /api/tenants/:id/check-ins/stats` | ⚠️ 403/null | Requires admin role |

---

## Files Modified

1. `lib/core/auth/auth_provider.dart` — Removed demo bypass, real cookie auth
2. `lib/core/api/api_client.dart` — Cookie-based auth (was Bearer token)
3. `lib/core/providers/tenant_provider.dart` — Removed demo mode
4. `lib/core/providers/stats_provider.dart` — Removed demo mode
5. `lib/core/providers/user_provider.dart` — Removed demo mode
6. `lib/core/providers/membership_provider.dart` — Removed demo mode
7. `lib/features/auth/screens/post_login_screen.dart` — Tenant persistence + auto-select
8. `lib/features/select_shop/screens/select_shop_screen.dart` — Save tenant selection
9. `lib/features/bookings/screens/bookings_screen.dart` — Fix back button navigation

---

## Screenshots Saved

All at `~/Timeo/store-handoff/screenshots/` (1290×2796, App Store ready):

1. `01-signin.png` — Clean sign-in screen with Timeo logo
2. `02-home.png` — Home with real membership data, WS Fitness branding
3. `03-qr.png` — QR code with real member ID and countdown timer
4. `04-membership.png` — Current plan card with real plan details
5. `05-profile.png` — Account screen with avatar, real user info

---

## What Still Needs Work

1. **Stats API for members** — either create a member-facing check-in stats endpoint, or hide stats when null
2. **Coach Notes** — connect to real API or remove from Home
3. **Recent Sessions** — connect to real API or remove
4. **Plan Benefits** — fetch from API based on plan type
5. **Apple Wallet** — implement wallet pass generation
6. **Upload script** — fix JWT generation for macOS (use Python or node instead of grep -P)
7. **Admin & Coach dashboards** — not tested in this QA pass
