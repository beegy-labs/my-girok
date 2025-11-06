# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY services/auth-service ./services/auth-service

# Build types package first
WORKDIR /app/packages/types
RUN pnpm build

# Build auth service
WORKDIR /app/services/auth-service
RUN pnpm build

# Generate Prisma client
RUN pnpm prisma generate

# Production stage
FROM node:22-alpine AS production

# Install security updates
RUN apk upgrade --no-cache

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

# Copy package files
COPY --chown=appuser:appuser package.json pnpm-lock.yaml ./
COPY --chown=appuser:appuser services/auth-service/package.json ./services/auth-service/
COPY --chown=appuser:appuser packages/types/package.json ./packages/types/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install production dependencies only
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --chown=appuser:appuser --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=appuser:appuser --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --chown=appuser:appuser --from=builder /app/services/auth-service/prisma ./services/auth-service/prisma
COPY --chown=appuser:appuser --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=appuser:appuser --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create temp directory
RUN mkdir -p /tmp && chown -R appuser:appuser /tmp

# Switch to non-root user
USER appuser

# Set working directory
WORKDIR /app/services/auth-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
