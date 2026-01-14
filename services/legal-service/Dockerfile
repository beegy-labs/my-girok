# Legal Service Dockerfile
# Multi-stage build for optimized production image

FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc ./

# Copy package files for dependency resolution
COPY packages/types/package.json ./packages/types/
COPY packages/nest-common/package.json ./packages/nest-common/
COPY packages/proto/package.json ./packages/proto/
COPY services/legal-service/package.json ./services/legal-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY packages/proto ./packages/proto
COPY services/legal-service ./services/legal-service

# Generate protobuf files first
WORKDIR /app/packages/proto
RUN pnpm generate

# Build shared packages
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Generate Prisma client and build legal service
WORKDIR /app/services/legal-service
RUN pnpm prisma:generate
RUN pnpm build

# Production stage
FROM node:24-alpine AS production

# Install security updates and goose for migrations
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    wget -q https://github.com/pressly/goose/releases/download/v3.24.1/goose_linux_x86_64 -O /usr/local/bin/goose && \
    chmod +x /usr/local/bin/goose

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy package files
COPY --chown=node:node services/legal-service/package.json ./services/legal-service/
COPY --chown=node:node packages/types/package.json ./packages/types/
COPY --chown=node:node packages/nest-common/package.json ./packages/nest-common/

# Copy prisma schema BEFORE installing dependencies so it's available for prisma generate
COPY --chown=node:node --from=builder /app/services/legal-service/prisma ./services/legal-service/prisma

# Copy built files
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --chown=node:node --from=builder /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --chown=node:node --from=builder /app/packages/nest-common/package.json ./packages/nest-common/package.json
COPY --chown=node:node --from=builder /app/services/legal-service/dist ./services/legal-service/dist

# Copy goose migrations
COPY --chown=node:node --from=builder /app/services/legal-service/migrations ./services/legal-service/migrations

# Copy proto files for gRPC
COPY --chown=node:node --from=builder /app/packages/proto ./packages/proto

# Install production dependencies (skip lifecycle scripts like husky)
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

WORKDIR /app/services/legal-service

# Generate Prisma Client
RUN pnpm prisma:generate

# Create temp directory with proper permissions
RUN mkdir -p /tmp && chown -R node:node /tmp

# Switch to non-root user
USER node

# Expose port
EXPOSE 3005 50053

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
