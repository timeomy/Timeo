FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# ─── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config-ts/package.json ./packages/config-ts/
COPY packages/config-eslint/package.json ./packages/config-eslint/
RUN pnpm install --frozen-lockfile --filter @timeo/web...

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY turbo.json ./

# Build-time env vars (baked into the Next.js bundle)
ARG NEXT_PUBLIC_API_URL=https://api.timeo.my
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ARG NEXT_PUBLIC_POSTHOG_KEY=
ARG NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @timeo/web build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
