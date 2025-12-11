# Build stage
FROM node:22-alpine AS builder

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_PERSONAL_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_PERSONAL_API_URL=${VITE_PERSONAL_API_URL}

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy all package.json files for proper dependency resolution
COPY apps/web-main/package.json ./apps/web-main/
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/

# Install dependencies including devDependencies for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY apps/web-main ./apps/web-main

# Build shared packages first
WORKDIR /app/packages/types
RUN pnpm build

# Generate Prisma client types if needed (for future use)
# WORKDIR /app
# RUN pnpm --filter @my-girok/types exec prisma generate

# Build application
WORKDIR /app/apps/web-main
RUN pnpm build

# Production stage with nginx-unprivileged (non-root)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

# Install security updates and gettext for envsubst (as root temporarily)
USER root
RUN apk upgrade --no-cache && \
    apk add --no-cache gettext

# Copy built files with proper ownership (UID 101 = nginx user in nginx-unprivileged)
COPY --from=builder --chown=101:101 /app/apps/web-main/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=101:101 apps/web-main/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY --chown=101:101 apps/web-main/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user (UID 101)
USER 101

# Expose port (must be >= 1024 for non-root)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Use entrypoint to replace environment variables
ENTRYPOINT ["/docker-entrypoint.sh"]
