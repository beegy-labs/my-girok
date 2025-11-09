# Build stage
FROM node:22-alpine AS builder

# Build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

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

# Production stage with nginx
FROM nginx:1.27-alpine AS production

# Install security updates and gettext for envsubst
RUN apk upgrade --no-cache && \
    apk add --no-cache gettext

# Copy built files
COPY --from=builder /app/apps/web-main/dist /usr/share/nginx/html

# Copy nginx configuration as template
COPY apps/web-main/nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy entrypoint script
COPY apps/web-main/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Setup permissions for nginx user (already exists in nginx:alpine image)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid && \
    chmod +x /docker-entrypoint.sh

# Note: Entrypoint runs as root to modify nginx config,
# then nginx process runs as nginx user (configured in nginx.conf)

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Use entrypoint to replace environment variables
ENTRYPOINT ["/docker-entrypoint.sh"]
