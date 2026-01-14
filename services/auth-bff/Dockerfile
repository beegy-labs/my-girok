# Build stage
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
COPY services/auth-bff/package.json ./services/auth-bff/

# Install dependencies from cache (very fast)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --offline --prefer-offline

# Copy source code
COPY packages/types ./packages/types
COPY packages/nest-common ./packages/nest-common
COPY packages/proto ./packages/proto
COPY services/auth-bff ./services/auth-bff

# Generate protobuf files first
WORKDIR /app/packages/proto
RUN pnpm generate

# Build shared packages
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/nest-common
RUN pnpm build

# Build auth-bff
WORKDIR /app/services/auth-bff
RUN pnpm build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

