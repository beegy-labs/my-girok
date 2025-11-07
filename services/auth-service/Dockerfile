# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy package files for dependency resolution
COPY packages/types/package.json ./packages/types/
COPY services/auth-service/package.json ./services/auth-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY services/auth-service ./services/auth-service

# Build types package first
WORKDIR /app/packages/types
RUN pnpm build

# Generate Prisma client and build auth service
WORKDIR /app/services/auth-service
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
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package files
COPY --chown=node:node services/auth-service/package.json ./services/auth-service/
COPY --chown=node:node packages/types/package.json ./packages/types/

# Install production dependencies only
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Copy built files and prisma schema
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --chown=node:node --from=builder /app/services/auth-service/prisma ./services/auth-service/prisma

# Copy generated Prisma Client from builder (pnpm stores it in .pnpm)
COPY --chown=node:node --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma ./node_modules/@prisma

# Create temp directory with proper permissions
RUN mkdir -p /tmp && chown -R node:node /tmp

# Switch to non-root user (node user is provided by node:alpine image)
USER node

# Set working directory
WORKDIR /app/services/auth-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
