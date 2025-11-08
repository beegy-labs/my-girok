# Build stage
FROM node:22-alpine AS builder

# Build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files for proper dependency resolution
COPY apps/web-main/package.json ./apps/web-main/
COPY packages/types/package.json ./packages/types/
COPY tsconfig.json ./

# Install dependencies including devDependencies for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY apps/web-main ./apps/web-main

# Build shared packages first
WORKDIR /app/packages/types
RUN pnpm build

# Build application
WORKDIR /app/apps/web-main
RUN pnpm build

# Production stage with nginx
FROM nginx:1.27-alpine AS production

# Install security updates
RUN apk upgrade --no-cache

# Copy built files
COPY --from=builder /app/apps/web-main/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web-main/nginx.conf /etc/nginx/conf.d/default.conf

# Setup permissions for nginx user (already exists in nginx:alpine image)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
