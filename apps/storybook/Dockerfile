# =============================================================================
# Storybook Dockerfile - Design System Documentation
# Multi-stage build with security best practices (2025)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build Storybook static files
# -----------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy package.json files for dependency resolution
COPY packages/types/package.json packages/types/tsconfig.json ./packages/types/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/ui-components/package.json packages/ui-components/tsconfig.json ./packages/ui-components/
COPY apps/storybook/package.json ./apps/storybook/

# Install dependencies (cached if package.json unchanged)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/design-tokens ./packages/design-tokens
COPY packages/ui-components ./packages/ui-components
COPY apps/storybook ./apps/storybook

# Build in dependency order
RUN pnpm --filter @my-girok/types build && \
    pnpm --filter @my-girok/design-tokens build || true && \
    pnpm --filter @my-girok/ui-components build && \
    pnpm --filter @my-girok/ui-components build-storybook

# -----------------------------------------------------------------------------
# Stage 2: Production - Serve with nginx-unprivileged
# -----------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

# Metadata
LABEL org.opencontainers.image.title="Storybook" \
      org.opencontainers.image.description="Design System Documentation - V0.0.1 AAA Workstation" \
      org.opencontainers.image.vendor="My-Girok" \
      org.opencontainers.image.source="https://github.com/your-org/my-girok"

# Install security updates (as root temporarily)
USER root
RUN apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Copy nginx configuration
COPY --chown=101:101 apps/storybook/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Storybook files
COPY --from=builder --chown=101:101 /app/packages/ui-components/storybook-static /usr/share/nginx/html

# Switch to non-root user (UID 101 = nginx user)
USER 101

# Expose port (>= 1024 for non-root)
EXPOSE 6006

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:6006/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
