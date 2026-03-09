# Timeo Customer App — Store Listing Setup Guide

## Pre-Requisites

### Apple App Store
- [ ] Apple Developer Account ($99/year) — https://developer.apple.com/programs/enroll/
- [ ] App Store Connect access — https://appstoreconnect.apple.com
- [ ] Fill in `appleTeamId` and `ascAppId` in `eas.json` → submit → production → ios

### Google Play Store
- [ ] Google Play Developer Account ($25 one-time) — https://play.google.com/console/signup
- [ ] Create app in Play Console → set up store listing
- [ ] Download Google Play service account JSON key for EAS Submit
- [ ] Run: `eas credentials` to configure the service account

---

## Store Metadata (Already Created)

The `store.config.json` file contains listing metadata for both stores:

| Field | Value |
|-------|-------|
| **App Name** | Timeo - Book & Shop Local |
| **Subtitle (iOS)** | Appointments, POS & Loyalty |
| **Short Description (Android)** | Book appointments, earn loyalty rewards, and shop at local businesses across Malaysia. |
| **Category** | Lifestyle / Shopping |
| **Pricing** | Free |
| **Privacy Policy URL** | https://timeo.my/privacy |
| **Terms of Service URL** | https://timeo.my/terms |
| **Account Deletion URL** | https://timeo.my/account-deletion |
| **Keywords** | booking, appointments, POS, loyalty, salon, gym, cafe, clinic, Malaysia |

---

## Required Assets (You Need to Provide)

### App Icon
- [x] 1024x1024 PNG (already at `assets/icon.png`)

### Screenshots (REQUIRED for both stores)

**iPhone Screenshots** (6.7" - iPhone 15 Pro Max: 1290 x 2796px)
- [ ] Screenshot 1: Landing/hero screen
- [ ] Screenshot 2: Business listing / services
- [ ] Screenshot 3: Booking flow
- [ ] Screenshot 4: Payment / checkout
- [ ] Screenshot 5: Loyalty rewards

**iPad Screenshots** (if supporting tablets: 2048 x 2732px)
- [ ] Optional but recommended

**Android Phone Screenshots** (1080 x 1920px minimum)
- [ ] Same 5 screenshots adapted for Android

**Android Tablet Screenshots** (optional)
- [ ] 7-inch and 10-inch if supporting tablets

### Feature Graphic (Android only)
- [ ] 1024 x 500px PNG or JPEG

---

## Build & Submit Commands

### Step 1: Build Production Binary

```bash
# iOS
cd apps/customer
eas build --platform ios --profile production

# Android
cd apps/customer
eas build --platform android --profile production
```

### Step 2: Submit to Stores

```bash
# iOS — submit to App Store Connect
eas submit --platform ios --profile production

# Android — submit to Google Play (internal track)
eas submit --platform android --profile production
```

### Step 3: Push Store Metadata (via EAS Metadata)

```bash
cd apps/customer
eas metadata:push --platform ios
eas metadata:push --platform android
```

---

## iOS-Specific Setup

### In App Store Connect:
1. Create new app with bundle ID `my.timeo.app`
2. Fill in the ASC App ID in `eas.json` → submit → production → ios → `ascAppId`
3. Set up App Privacy questionnaire:
   - Data collected: Name, Email, Phone, Payment Info, Location, Usage Data
   - Linked to identity: Name, Email, Phone
   - Used for tracking: No
4. Upload screenshots (manually or via `eas metadata:push`)
5. Set age rating: 4+ (no objectionable content)
6. Set pricing: Free

### Review Notes (already in store.config.json):
```
This is a multi-tenant business platform. For testing, use the demo account:
Email: customer@demo.my
Password: Demo1234!
This will show the Iron Paradise Gym demo tenant with sample services, products, and bookings.
```

---

## Android-Specific Setup

### In Google Play Console:
1. Create new app
2. Set up store listing (title, description, screenshots)
3. Content rating: complete the questionnaire
4. Target audience: 18+ (financial transactions)
5. Data safety section:
   - Data collected: Name, Email, Phone, Payment info, Location, App activity
   - Data shared: With businesses for service fulfilment
   - Data encrypted in transit: Yes
   - Users can request deletion: Yes (https://timeo.my/account-deletion)
6. Set up closed testing track first (internal → alpha → beta → production)

### Service Account for EAS Submit:
1. In Play Console → Settings → Developer account → API access
2. Create service account or link existing one
3. Download JSON key
4. Run: `eas credentials --platform android` and provide the key path

---

## Post-Submission Checklist

- [ ] iOS build uploaded and processing
- [ ] Android build uploaded to internal track
- [ ] Screenshots uploaded for all required device sizes
- [ ] Privacy policy page live at https://timeo.my/privacy
- [ ] Terms of service page live at https://timeo.my/terms
- [ ] Account deletion page live at https://timeo.my/account-deletion
- [ ] App review notes filled in (demo credentials)
- [ ] Age rating / content rating completed
- [ ] Data privacy questionnaire completed
- [ ] Pricing set to Free
- [ ] Deploy web changes (privacy, terms, account-deletion pages)
