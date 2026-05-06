FROM node:22.16-alpine AS base

RUN apk add --no-cache libc6-compat openssl \
    && corepack enable

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

RUN npm prune --prod

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 fastify --ingroup nodejs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma
COPY --from=builder --chown=fastify:nodejs /app/prisma.config.ts ./prisma.config.ts

USER fastify

EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]