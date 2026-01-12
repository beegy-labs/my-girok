# Build stage
FROM node:24-alpine AS builder

# Build arguments for environment variables
ARG VITE_ADMIN_API_URL
ENV VITE_ADMIN_API_URL=${VITE_ADMIN_API_URL}

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy all package.json files for proper dependency resolution
COPY apps/web-admin/package.json ./apps/web-admin/
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY packages/ui-components/tsconfig.json ./packages/ui-components/

# Install dependencies including devDependencies for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/design-tokens ./packages/design-tokens
COPY packages/ui-components ./packages/ui-components
COPY apps/web-admin ./apps/web-admin

# Build shared packages first
WORKDIR /app/packages/types
RUN pnpm build

# Build UI components
WORKDIR /app/packages/ui-components
RUN pnpm build

# Build application
WORKDIR /app/apps/web-admin
RUN pnpm build

# Production stage with nginx-unprivileged (non-root)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

# Install security updates (as root temporarily)
USER root
RUN apk upgrade --no-cache

# Copy built files with proper ownership (UID 101 = nginx user in nginx-unprivileged)
COPY --from=builder --chown=101:101 /app/apps/web-admin/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=101:101 apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY --chown=101:101 apps/web-admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user (UID 101)
USER 101

# Expose port (must be >= 1024 for non-root)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
