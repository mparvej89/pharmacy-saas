# Multi-stage Dockerfile for Pharmacy SaaS Backend (@pharmacy-saas/api)
# Compatible with Neon PostgreSQL over TLS and local Docker Compose

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Stage 1: Install workspace dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci

# Stage 2: Generate Prisma Client & build NestJS API
FROM deps AS builder
COPY apps/api ./apps/api
RUN npm --workspace=apps/api run prisma:generate
RUN npm --workspace=apps/api run build

# Stage 3: Production-ready runtime image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/src/main.js"]

