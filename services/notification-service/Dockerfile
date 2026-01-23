# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm and buf
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate && \
    wget -qO /usr/local/bin/buf https://github.com/bufbuild/buf/releases/download/v1.28.0/buf-Linux-x86_64 && \
    chmod +x /usr/local/bin/buf

# Copy lock file first for pnpm fetch (best cache layer)
COPY pnpm-lock.yaml ./

# Fetch dependencies into pnpm store (cached independently)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# Copy workspace configuration and package files
COPY package.json pnpm-workspace.yaml tsconfig.json .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/nest-common/package.json ./packages/nest-common/
COPY packages/proto/package.json ./packages/proto/
COPY services/notification-service/package.json ./services/notification-service/

# Install dependencies from cache (very fast)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    CI=true pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY packages/proto ./packages/proto
COPY services/notification-service ./services/notification-service

# Generate protobuf files first
WORKDIR /app/packages/proto
RUN pnpm generate

# Build shared packages
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Generate Prisma client and build notification service
WORKDIR /app/services/notification-service
RUN pnpm prisma:generate
RUN pnpm build

# Production stage
FROM node:24-alpine AS production

# Install security updates and goose for migrations
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    wget -qO /usr/local/bin/goose https://github.com/pressly/goose/releases/download/v3.24.1/goose_linux_x86_64 && \
    chmod +x /usr/local/bin/goose

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy package files
COPY --chown=node:node services/notification-service/package.json ./services/notification-service/
COPY --chown=node:node packages/types/package.json ./packages/types/
COPY --chown=node:node packages/nest-common/package.json ./packages/nest-common/

# Copy prisma schema BEFORE installing dependencies so it's available for prisma generate
COPY --chown=node:node --from=builder /app/services/notification-service/prisma ./services/notification-service/prisma

# Copy built files
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --chown=node:node --from=builder /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --chown=node:node --from=builder /app/packages/nest-common/package.json ./packages/nest-common/package.json
COPY --chown=node:node --from=builder /app/services/notification-service/dist ./services/notification-service/dist

# Copy goose migrations
COPY --chown=node:node --from=builder /app/services/notification-service/migrations ./services/notification-service/migrations

# Copy proto files for gRPC
COPY --chown=node:node --from=builder /app/packages/proto ./packages/proto

# CRITICAL: Copy Prisma client from builder stage (fixes dual-generation issue)
COPY --chown=node:node --from=builder /app/services/notification-service/node_modules/.prisma ./services/notification-service/node_modules/.prisma

# Install production dependencies (skip lifecycle scripts like husky)
ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm-prod,target=/root/.local/share/pnpm/store \
    CI=true pnpm install --prod --frozen-lockfile --ignore-scripts --prefer-offline

WORKDIR /app/services/notification-service

# DO NOT regenerate Prisma client - use the one from builder stage
# The compiled dist/ files reference the builder's Prisma client

# Create temp directory with proper permissions
RUN mkdir -p /tmp && chown -R node:node /tmp

# Switch to non-root user (node user is provided by node:alpine image)
USER node

# Set working directory
WORKDIR /app/services/notification-service

# Expose gRPC port
EXPOSE 50055

# Health check (gRPC health check via HTTP endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
