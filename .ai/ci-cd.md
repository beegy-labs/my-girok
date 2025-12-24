# CI/CD Quick Reference

> GitHub Actions → Harbor → ArgoCD → Kubernetes

## Overview

| Component | Tool                      |
| --------- | ------------------------- |
| CI        | GitHub Actions            |
| Registry  | Harbor (harbor.girok.dev) |
| CD        | ArgoCD                    |

## Image Tagging

| Branch     | Tag Format                         |
| ---------- | ---------------------------------- |
| develop    | `develop:<hash>`, `develop:latest` |
| release/\* | `release:<hash>`, `release:latest` |
| main       | `latest`                           |

## Git Flow → Environment

| Branch     | ArgoCD App       | Namespace        | Environment |
| ---------- | ---------------- | ---------------- | ----------- |
| develop    | my-girok-dev     | my-girok-dev     | Development |
| release/\* | my-girok-staging | my-girok-staging | Staging     |
| main       | my-girok-prod    | my-girok-prod    | Production  |

## GitHub Secrets

```bash
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-token>
```

## Workflow Triggers

**Auth Service**: `services/auth-service/**`, `packages/types/**`
**Web-Main**: `apps/web-main/**`, `packages/types/**`

## Performance Optimization

**Web-Main CI**: ~3-5 min (parallel jobs with caching)

```yaml
# Parallel jobs
lint → │
type-check → ├─> build
test → │

# Node modules cache
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
```

## Database Migrations

**Manual Sync required** for DB changes.

```dockerfile
# Dockerfile includes goose
COPY migrations ./services/<service>/migrations

# ArgoCD PreSync Job runs
goose -dir /app/services/<service>/migrations postgres "$DATABASE_URL" up
```

## Local Build Test

```bash
# Auth Service
docker build -t test/auth-service:local -f services/auth-service/Dockerfile .

# Web-Main
docker build --build-arg VITE_API_URL=https://auth-api-dev.girok.dev/api/v1 \
  -t test/web-main:local -f apps/web-main/Dockerfile .
```

---

**Full guide**: `docs/CI_CD.md`
