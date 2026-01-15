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
COPY services/audit-service/package.json ./services/audit-service/

# Install dependencies from cache (very fast)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    CI=true pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY packages/proto ./packages/proto
COPY services/audit-service ./services/audit-service

# Generate protobuf files first
WORKDIR /app/packages/proto
RUN pnpm generate

# Build shared packages
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Build audit service
WORKDIR /app/services/audit-service
RUN pnpm build

# Production stage
FROM node:24-alpine AS production

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy package files
COPY --chown=node:node services/audit-service/package.json ./services/audit-service/
COPY --chown=node:node packages/types/package.json ./packages/types/
COPY --chown=node:node packages/nest-common/package.json ./packages/nest-common/

# Copy built files
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --chown=node:node --from=builder /app/services/audit-service/dist ./services/audit-service/dist

# Copy proto files for gRPC
COPY --chown=node:node --from=builder /app/packages/proto ./packages/proto

# Install production dependencies
ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm-prod,target=/root/.local/share/pnpm/store \
    CI=true pnpm install --prod --frozen-lockfile --ignore-scripts --prefer-offline

# Create temp directory
RUN mkdir -p /tmp && chown -R node:node /tmp

# Switch to non-root user
USER node

WORKDIR /app/services/audit-service

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/services/audit-service/src/main.js"]
