# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc ./

# Copy package files for dependency resolution
COPY packages/types/package.json ./packages/types/
COPY packages/nest-common/package.json ./packages/nest-common/
COPY services/personal-service/package.json ./services/personal-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY services/personal-service ./services/personal-service

# Build shared packages first
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Generate Prisma client and build personal service
WORKDIR /app/services/personal-service
RUN pnpm prisma:generate
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install security updates
RUN apk upgrade --no-cache

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy package files
COPY --chown=node:node services/personal-service/package.json ./services/personal-service/
COPY --chown=node:node packages/types/package.json ./packages/types/
COPY --chown=node:node packages/nest-common/package.json ./packages/nest-common/

# Copy prisma schema BEFORE installing dependencies so it's available for prisma generate
COPY --chown=node:node --from=builder /app/services/personal-service/prisma ./services/personal-service/prisma

# Copy built files
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --chown=node:node --from=builder /app/packages/nest-common/dist ./packages/nest-common/dist
COPY --chown=node:node --from=builder /app/packages/nest-common/package.json ./packages/nest-common/package.json
COPY --chown=node:node --from=builder /app/services/personal-service/dist ./services/personal-service/dist

# Install production dependencies (skip lifecycle scripts like husky)
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

WORKDIR /app/services/personal-service

# Generate Prisma Client
RUN pnpm prisma:generate

# Create temp directory with proper permissions
RUN mkdir -p /tmp && chown -R node:node /tmp

# Switch to non-root user (node user is provided by node:alpine image)
USER node

# Set working directory
WORKDIR /app/services/personal-service

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
