# Timeo Flutter App — Social Platform Redesign

> **Status:** Design spec — implementation pending  
> **Objective:** Transform the Flutter app home screen into a social-media-style platform experience matching the web portal redesign.

---

## 🎯 Vision

Timeo is NOT just a gym management app. It's a social platform where:
- Businesses post broadcasts/promotions (like stories/feed posts)
- Users browse a catalog of services
- Users book appointments directly
- Feed keeps users engaged like social media (think Fresha/Booksy)

---

## 📱 Screen Architecture

### Bottom Navigation (5 tabs)

```
[ Home ] [ Appointments ] [ QR (FAB) ] [ History ] [ Account ]
```

- **Home** — Social feed, broadcasts, quick actions
- **Appointments** — Upcoming/past bookings
- **QR Code** — Center FAB (floating action button), prominent, pulsing green ring
- **History** — Check-in history, training logs
- **Account** — Profile, settings, sign out

---

## 🏠 Home Screen Layout (top → bottom)

### 1. Tenant Header Bar
```
┌─────────────────────────────────────────┐
│  [GymLogo]  WS Fitness    [Notif Bell]  │
│  Hey, John! 👋                           │
└─────────────────────────────────────────┘
```
- If user has multiple tenants → tapping gym name opens a **bottom sheet** tenant switcher
- Show gym logo (from `tenant.branding.logoUrl`) or fallback to Dumbbell icon

### 2. Category Tab Row (horizontal scroll)
```
[ 📢 Feed ]  [ 🏷 Catalog ]  [ 🎟 Vouchers ]
```
- Pill-shaped tabs, active = primary color with shadow
- Smooth animated indicator

### 3. Content Area (changes per tab)

#### Tab A: Feed
1. **Broadcast Carousel** — full-width image cards, horizontal swipe
   - Each card: background image + gradient overlay + type badge + title + content
   - Auto-advances every 5s
   - Dot indicator at bottom
   - Type badges: Promo (amber), News (blue), Event (purple), New Service (emerald)

2. **Quick Action Cards** (2-column grid)
   - "Book a Session" → Calendar icon, primary color
   - "Browse Packages" → ShoppingBag icon

3. **My Package** — session credits widget
   - Big number for remaining sessions
   - Progress bar (green → amber → red)
   - Expiry date

4. **Training History** — last 3 training logs, expandable

5. **My Coach** card (if assigned)

#### Tab B: Catalog
- Grid of service cards (2 columns)
- Each card: category label, service name, price, duration

#### Tab C: Vouchers
- Link to full vouchers list page

---

## 🔌 API Endpoints Needed

### Broadcasts
```
GET /api/tenants/:tenantId/broadcasts
→ Returns active broadcasts for a tenant

Response:
[{
  id, tenantId, title, content, imageUrl, linkUrl,
  type: "promotion" | "announcement" | "event" | "new_service",
  isActive, startsAt, expiresAt, createdAt,
  tenantName, tenantLogo
}]
```

### Service Catalog
```
GET /api/tenants/:tenantId/catalog
→ Returns active services in the catalog

Response:
[{
  id, tenantId, name, description, price, durationMinutes,
  category, imageUrl, isActive, createdAt
}]
```

### Existing endpoints (already working)
```
GET /api/tenants/:tenantId/sessions/credits  → session credits
GET /api/tenants/:tenantId/coaches/my-coach  → assigned coach
GET /api/tenants/:tenantId/coaches/my-logs   → training logs
GET /api/tenants/:tenantId/check-ins/qr      → QR code
POST /api/tenants/:tenantId/check-ins/qr/generate → generate QR
```

---

## 📦 Data Models (Dart)

```dart
class Broadcast {
  final String id;
  final String tenantId;
  final String? title;
  final String? content;
  final String? imageUrl;
  final String? linkUrl;
  final String type; // promotion | announcement | event | new_service
  final bool isActive;
  final DateTime startsAt;
  final DateTime? expiresAt;
  final DateTime createdAt;
  final String? tenantName;
  final String? tenantLogo;
}

class ServiceCatalogItem {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final int price; // cents
  final int durationMinutes;
  final String? category;
  final String? imageUrl;
  final bool isActive;
  final DateTime createdAt;
}
```

---

## 🎨 Design Tokens

Match the web portal's dark theme:

```dart
// Colors
const Color backgroundDark = Color(0xFF0D0D1A);
const Color cardBg = Color(0xFF1A1A2E);
const Color borderColor = Color(0x1AFFFFFF); // white/10
const Color primaryColor = Color(0xFF6C63FF); // purple primary
const Color textPrimary = Colors.white;
const Color textSecondary = Color(0x99FFFFFF); // white/60
const Color textMuted = Color(0x66FFFFFF); // white/40

// Broadcast type colors
const Map<String, Color> broadcastColors = {
  'promotion': Color(0xFFF59E0B),   // amber
  'announcement': Color(0xFF3B82F6), // blue
  'event': Color(0xFF8B5CF6),        // purple
  'new_service': Color(0xFF10B981),  // emerald
};
```

---

## 📐 Component Breakdown

### BroadcastCarousel Widget
```dart
class BroadcastCarousel extends StatefulWidget {
  final List<Broadcast> broadcasts;
  final String tenantName;
}
// - PageView with auto-advance (Timer, 5s)
// - Stack with image + gradient overlay
// - Dot indicator at bottom
// - Left/right chevron buttons
```

### ServiceCatalogGrid Widget
```dart
class ServiceCatalogGrid extends StatelessWidget {
  final List<ServiceCatalogItem> items;
}
// - GridView.builder, 2 columns
// - Each card: category chip, name, price, duration
```

### QrCodeFab (center FAB)
```dart
// Floating action button with:
// - Animated pulsing emerald ring
// - Shows QR code in bottom sheet when tapped
// - Auto-refreshes every 30s countdown
```

### TenantSwitcher (bottom sheet)
```dart
// Lists all tenant memberships
// Tap to switch active tenant
// All data refetches after switch
```

---

## 🛠 Implementation Files to Create/Modify

```
lib/
├── features/
│   ├── feed/
│   │   ├── models/
│   │   │   ├── broadcast.dart
│   │   │   └── service_catalog_item.dart
│   │   ├── repositories/
│   │   │   └── feed_repository.dart
│   │   ├── providers/
│   │   │   ├── broadcasts_provider.dart
│   │   │   └── catalog_provider.dart
│   │   └── widgets/
│   │       ├── broadcast_carousel.dart
│   │       ├── broadcast_card.dart
│   │       ├── service_catalog_grid.dart
│   │       └── service_catalog_card.dart
│   └── home/
│       ├── screens/
│       │   └── home_screen.dart           ← REWRITE
│       └── widgets/
│           ├── gym_header.dart             ← NEW
│           ├── category_tab_bar.dart       ← NEW
│           ├── quick_action_grid.dart      ← NEW
│           ├── membership_card.dart        ← UPDATE
│           └── training_history.dart       ← KEEP
└── navigation/
    └── main_navigation.dart               ← ADD QR FAB
```

---

## 🚀 Build Notes

1. Use Riverpod for state management (already in project)
2. Use `cached_network_image` for broadcast images
3. `carousel_slider` or custom `PageView` for broadcast carousel
4. All API calls use the existing `ApiClient` (base URL from env)
5. Tenant switching: update `activeTenantId` in SharedPreferences + invalidate all providers

---

## 🧪 Test Credentials

- **Email:** member@wsfitness.my
- **Password:** WSFitness@2026
- **Tenant:** WS Fitness (`7Kw87VeAnXg4qDXi6UTbu`)

Test with this account to verify:
- [ ] Broadcasts appear in carousel
- [ ] Service catalog shows 5 demo services
- [ ] Session credits display
- [ ] QR code generates
- [ ] Tab switching works

---

*Last updated: 2026-03-15 — Timeo Social Platform redesign*
