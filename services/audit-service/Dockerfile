# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc ./

# Copy package files for dependency resolution
COPY packages/types/package.json ./packages/types/
COPY packages/nest-common/package.json ./packages/nest-common/
COPY services/audit-service/package.json ./services/audit-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY packages/proto ./packages/proto
COPY services/audit-service ./services/audit-service

# Build shared packages first
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
COPY --chown=node:node packages/proto ./packages/proto

# Copy built files
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --chown=node:node --from=builder /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --chown=node:node --from=builder /app/packages/nest-common/package.json ./packages/nest-common/package.json
COPY --chown=node:node --from=builder /app/services/audit-service/dist ./services/audit-service/dist

# Install production dependencies (skip lifecycle scripts like husky)
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

WORKDIR /app/services/audit-service

# Create temp directory with proper permissions
RUN mkdir -p /tmp && chown -R node:node /tmp

# Switch to non-root user
USER node

# Expose port
EXPOSE 3003 50054

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
