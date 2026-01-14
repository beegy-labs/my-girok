# Legal Service Dockerfile
# Multi-stage build for optimized production image

FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy lock file first for pnpm fetch (best cache layer)
COPY pnpm-lock.yaml ./

# Fetch dependencies into pnpm store (cached independently)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# Copy workspace configuration and package files
COPY package.json pnpm-workspace.yaml tsconfig.json .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/nest-common/package.json ./packages/nest-common/
COPY packages/proto/package.json ./packages/proto/
COPY services/legal-service/package.json ./services/legal-service/

# Install dependencies from cache (very fast)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --offline --prefer-offline

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY packages/proto ./packages/proto
COPY services/legal-service ./services/legal-service

# Generate protobuf files first
WORKDIR /app/packages/proto
RUN pnpm generate

# Build shared packages
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Generate Prisma client and build legal service
WORKDIR /app/services/legal-service
RUN pnpm prisma:generate
RUN pnpm build

# Production stage
FROM node:24-alpine AS production

# Install security updates and goose for migrations
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    wget -q https://github.com/pressly/goose/releases/download/v3.24.1/goose_linux_x86_64 -O /usr/local/bin/goose && \
    chmod +x /usr/local/bin/goose

WORKDIR /app

