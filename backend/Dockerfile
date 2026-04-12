# Use Node 20 Alpine for a small, secure base image
FROM node:20-alpine AS base

# --- Dependencies Layer ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# --- Build Layer ---
FROM base AS builder
WORKDIR /app
COPY . .
# If there were a build step for backend (e.g. TS), it would go here
# RUN npm run build

# --- Runner Layer ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 5000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Adjust permissions
RUN chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 5000

# Healthcheck to ensure the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/index.js"]
