# Docker Best Practices - 2026

This guide covers Docker best practices as of 2026, focusing on multi-stage builds, Node.js optimization, and security hardening.

## Multi-Stage Build Benefits

| Benefit        | Impact                        |
| -------------- | ----------------------------- |
| Size reduction | 70%+ smaller images           |
| Security       | No build tools in production  |
| Faster deploys | Less data to transfer         |
| Better caching | Separate build/runtime layers |

## Node.js Service Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

# Stage 2: Build
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:24-alpine AS runner
WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Use dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy only production artifacts
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN chown -R appuser:nodejs /app
USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

## React App Dockerfile

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Stage 2: Production (nginx)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf for SPA

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

## .dockerignore

```
node_modules
.pnpm-store
dist
build
.turbo
.git
.gitignore
*.md
.env*
!.env.example
.vscode
.idea
coverage
__tests__
*.test.ts
*.spec.ts
Dockerfile*
docker-compose*
.dockerignore
```

## Base Image Selection

| Image                      | Size   | Use Case                 |
| -------------------------- | ------ | ------------------------ |
| `node:24`                  | ~1GB   | Development, debugging   |
| `node:24-slim`             | ~200MB | Need additional packages |
| `node:24-alpine`           | ~50MB  | Production (recommended) |
| `gcr.io/distroless/nodejs` | ~100MB | Maximum security         |

## Security Best Practices

### 1. Non-Root User

```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

USER appuser
```

### 2. Read-Only Filesystem

```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - ./logs:/app/logs:rw
```

### 3. Security Scanning

```bash
# Docker Scout
docker scout cves myimage:latest

# Trivy
trivy image myimage:latest
```

### 4. Minimal Attack Surface

```dockerfile
# Remove unnecessary packages after build
RUN apk del --no-cache make gcc g++ python3

# Or use distroless images
FROM gcr.io/distroless/nodejs24-debian12
```

## Build Optimization

### Layer Caching

```dockerfile
# GOOD: Dependencies change less often
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# BAD: Invalidates cache on any file change
COPY . .
RUN pnpm install && pnpm build
```

### BuildKit Features

```dockerfile
# syntax=docker/dockerfile:1

# Cache mounts for package managers
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# Secret mounts (never stored in image)
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) pnpm install
```

Enable BuildKit:

```bash
DOCKER_BUILDKIT=1 docker build .
```

## Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

## Environment Variables

```dockerfile
# Build-time args
ARG NODE_ENV=production
ARG APP_VERSION

# Runtime env
ENV NODE_ENV=${NODE_ENV}
ENV APP_VERSION=${APP_VERSION}

# Don't include secrets - pass at runtime
# docker run -e SECRET_KEY=xxx
```

## Docker Compose for Development

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
    command: pnpm dev

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  valkey:
    image: valkey/valkey:8-alpine
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

## Production Checklist

- Multi-stage build (separate build/runtime)
- Alpine or distroless base image
- Non-root user
- dumb-init or tini for signal handling
- Health check defined
- .dockerignore configured
- No secrets in image
- Specific version tags (not :latest)
- Security scan passed
- Read-only filesystem where possible

## Anti-Patterns to Avoid

| Don't               | Do                      | Reason             |
| ------------------- | ----------------------- | ------------------ |
| Run as root         | Create non-root user    | Security           |
| Use `:latest` tag   | Pin versions            | Reproducibility    |
| Include dev deps    | Multi-stage build       | Image size         |
| Store secrets       | Use runtime env/secrets | Security           |
| Skip .dockerignore  | Configure properly      | Build context size |
| Single RUN per line | Combine with &&         | Layer count        |

## Sources

- [Docker Multi-Stage Builds Guide](https://smarttechways.com/2026/01/16/multi-stage-builds-in-docker-a-complete-guide/)
- [Docker Best Practices for Node.js](https://medium.com/@regansomi/4-easy-docker-best-practices-for-node-js-build-faster-smaller-and-more-secure-containers-151474129ac0)
- [Node.js Multi-Stage Dockerfile](https://oneuptime.com/blog/post/2026-01-06-nodejs-multi-stage-dockerfile/view)
- [Docker Official Multi-Stage Docs](https://docs.docker.com/build/building/multi-stage/)
- [Node.js Docker Best Practices](https://github.com/AlbertHernandez/nodejs-docker-best-practices)

---

_Last Updated: 2026-01-22_
