# Legal Service Dockerfile
# Multi-stage build for optimized production image

FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY tsconfig.json ./

# Copy packages
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common

# Copy service
COPY services/legal-service ./services/legal-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @my-girok/legal-service prisma:generate

# Build packages
RUN pnpm --filter @my-girok/types build
RUN pnpm --filter @my-girok/nest-common build

# Build service
RUN pnpm --filter @my-girok/legal-service build

# Production image
FROM node:24-alpine AS runner

WORKDIR /app

# Install goose for migrations
RUN apk add --no-cache curl && \
    curl -fsSL https://github.com/pressly/goose/releases/download/v3.24.1/goose_linux_x86_64 -o /usr/local/bin/goose && \
    chmod +x /usr/local/bin/goose && \
    apk del curl

# Copy built files
COPY --from=builder /app/services/legal-service/dist ./dist
COPY --from=builder /app/services/legal-service/node_modules ./node_modules
COPY --from=builder /app/services/legal-service/prisma ./prisma
COPY --from=builder /app/services/legal-service/migrations ./migrations

# Set environment
ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

CMD ["node", "dist/main.js"]
