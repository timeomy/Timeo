FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/payments/package.json ./packages/payments/package.json
COPY packages/analytics/package.json ./packages/analytics/package.json
COPY packages/cms/package.json ./packages/cms/package.json
COPY packages/notifications/package.json ./packages/notifications/package.json
COPY packages/config-ts/package.json ./packages/config-ts/package.json
COPY packages/config-eslint/package.json ./packages/config-eslint/package.json
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .

# Build args for NEXT_PUBLIC_* vars (baked into the client bundle at build time)
# Defaults are set so the build works without Dokploy passing --build-arg.
# Pass build args to override (e.g. for staging environments).
ARG NEXT_PUBLIC_CONVEX_URL=https://mild-gnat-567.convex.cloud
ARG NEXT_PUBLIC_CONVEX_SITE_URL=https://mild-gnat-567.convex.site
ARG NEXT_PUBLIC_APP_URL=https://timeo.my
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

RUN pnpm --filter @timeo/web build

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Public Convex URLs needed at runtime by the auth proxy API route
ENV NEXT_PUBLIC_CONVEX_URL=https://mild-gnat-567.convex.cloud
ENV NEXT_PUBLIC_CONVEX_SITE_URL=https://mild-gnat-567.convex.site
ENV NEXT_PUBLIC_APP_URL=https://timeo.my

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
