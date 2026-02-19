# Clerk Setup Guide for Timeo

This document covers every manual step required in the Clerk Dashboard to configure authentication and multi-tenancy for Timeo.

## 1. Create a Clerk Application

1. Go to [clerk.com/dashboard](https://dashboard.clerk.com) and create a new application
2. Name it **Timeo** (or your preferred name)
3. Copy the **Publishable Key** and **Secret Key** into your `.env`:
   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

## 2. Configure Sign-In Methods

In **User & Authentication → Email, Phone, Username**:

- [x] Enable **Email address** (required)
- [x] Enable **Password** authentication
- [ ] Optionally enable **Google**, **Apple**, or other OAuth providers under **Social Connections**

## 3. Enable Organizations

In **Organizations → Settings**:

1. Toggle **Enable Organizations** → ON
2. Set **Maximum organizations per user** → Unlimited (or your desired limit)
3. Under **Roles**, create these custom org roles:
   | Role Name      | Role Key           | Description                        |
   | -------------- | ------------------ | ---------------------------------- |
   | Customer       | `org:customer`     | End-user, can book and order       |
   | Staff          | `org:staff`        | Staff member, manages day-to-day   |
   | Admin          | `org:admin`        | Tenant admin, full tenant control  |
   | Platform Admin | `org:platform_admin` | Cross-tenant system administrator  |
4. Set the **Default role** for new members to `org:customer`

## 4. Create JWT Template for Convex

In **JWT Templates**, create a new template:

- **Name**: `convex`
- **Signing algorithm**: RS256 (default)
- **Claims** (JSON):
  ```json
  {
    "sub": "{{user.id}}",
    "org_id": "{{org.id}}",
    "org_role": "{{org_membership.role}}",
    "org_slug": "{{org.slug}}",
    "email": "{{user.primary_email_address}}"
  }
  ```

This template is used by ConvexProviderWithClerk to mint tokens that Convex can verify.

## 5. Configure Webhook Endpoint

In **Webhooks**, add a new endpoint:

- **URL**: `https://your-domain.com/api/webhooks/clerk`
- **Events to subscribe**:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `organization.created`
  - `organization.updated`
  - `organization.deleted`
  - `organizationMembership.created`
  - `organizationMembership.updated`
  - `organizationMembership.deleted`
- Copy the **Signing Secret** into your `.env`:
  ```
  CLERK_WEBHOOK_SECRET=whsec_...
  ```

## 6. Environment Variables Summary

### Mobile Apps (Expo)

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Web App (Next.js)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## 7. Convex Integration

In your Convex dashboard (**Settings → Environment Variables**), add:

```
CLERK_ISSUER_URL=https://your-clerk-instance.clerk.accounts.dev
```

Then in `convex/auth.config.ts` (Backend Agent's responsibility):
```ts
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
```

## 8. Usage in Apps

### Mobile (Expo)

```tsx
import { TimeoAuthProvider } from "@timeo/auth";

export default function App() {
  return (
    <TimeoAuthProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      convexUrl={process.env.EXPO_PUBLIC_CONVEX_URL!}
    >
      {/* App content */}
    </TimeoAuthProvider>
  );
}
```

### Web (Next.js)

```tsx
// app/layout.tsx
import { TimeoWebAuthProvider } from "@timeo/auth/web";

export default function RootLayout({ children }) {
  return (
    <TimeoWebAuthProvider convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL!}>
      {children}
    </TimeoWebAuthProvider>
  );
}

// middleware.ts
export { timeoMiddleware as default } from "@timeo/auth/web";
export { middlewareMatcher as config } from "@timeo/auth/web";
```
