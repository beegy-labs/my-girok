# Build stage
FROM node:22-alpine AS builder

# Build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/web-test/package.json ./apps/web-test/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web-test ./apps/web-test

# Build application
WORKDIR /app/apps/web-test
RUN pnpm build

# Production stage with nginx
FROM nginx:1.27-alpine AS production

# Install security updates
RUN apk upgrade --no-cache

# Copy built files
COPY --from=builder /app/apps/web-test/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web-test/nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
