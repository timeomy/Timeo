FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# ─── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/config-ts/package.json ./packages/config-ts/
RUN pnpm install --frozen-lockfile --filter @timeo/api... --filter @timeo/db

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY packages/ ./packages/
COPY turbo.json ./
RUN pnpm --filter @timeo/api build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/packages/api/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules

USER hono
EXPOSE 4000
CMD ["node", "dist/server.js"]
