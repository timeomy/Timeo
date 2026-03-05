FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# ─── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/config-ts/package.json ./packages/config-ts/
RUN pnpm install --frozen-lockfile --filter @timeo/api... --filter @timeo/db

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/ ./
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
COPY --from=builder --chown=hono:nodejs /app/packages/api/migrate.mjs ./migrate.mjs
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=hono:nodejs /app/packages/auth ./packages/auth
COPY --from=builder --chown=hono:nodejs /app/packages/shared ./packages/shared

# ESM support — the bundled dist/server.js is ESM format
RUN echo '{"type":"module"}' > package.json

USER hono
EXPOSE 4000
# Run migrations before starting the server
CMD ["sh", "-c", "node migrate.mjs && node dist/server.js"]
