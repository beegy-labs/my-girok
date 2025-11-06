# CI/CD Quick Reference

## Overview

- **CI**: GitHub Actions (build & push to Harbor)
- **CD**: ArgoCD (deploy to Kubernetes)
- **Registry**: Harbor (harbor.girok.dev)

## GitHub Actions Workflows

### Auth Service CI
- **File**: `.github/workflows/ci-auth-service.yml`
- **Triggers**: Push to develop, release/*, main (when auth-service changes)
- **Steps**: Test → Build → Push to Harbor

### Web Test CI
- **File**: `.github/workflows/ci-web-test.yml`
- **Triggers**: Push to develop, release/*, main (when web-test changes)
- **Steps**: Test → Build (with API URL) → Push to Harbor

## Image Tagging Strategy

| Branch | Tag Format | Example |
|--------|------------|---------|
| develop | `develop:<hash>` + `develop:latest` | `develop:a1b2c3d`, `develop:latest` |
| release/* | `release:<hash>` + `release:latest` | `release:a1b2c3d`, `release:latest` |
| main | `latest` | `latest` |

## Harbor Images

**Auth Service:**
```
harbor.girok.dev/my-girok/auth-service:develop:a1b2c3d
harbor.girok.dev/my-girok/auth-service:develop:latest
harbor.girok.dev/my-girok/auth-service:release:a1b2c3d
harbor.girok.dev/my-girok/auth-service:release:latest
harbor.girok.dev/my-girok/auth-service:latest
```

**Web Test:**
```
harbor.girok.dev/my-girok/web-test:develop:a1b2c3d
harbor.girok.dev/my-girok/web-test:develop:latest
harbor.girok.dev/my-girok/web-test:release:a1b2c3d
harbor.girok.dev/my-girok/web-test:release:latest
harbor.girok.dev/my-girok/web-test:latest
```

## Required GitHub Secrets

```bash
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-account-token>
```

## API URL Configuration (Web Test)

Build-time environment variable injection:

- **develop**: `https://auth-api-dev.girok.dev/api/v1`
- **release/***: `https://auth-api-staging.girok.dev/api/v1`
- **main**: `https://auth-api.girok.dev/api/v1`

**Update in**: `.github/workflows/ci-web-test.yml`

## Workflow Trigger Paths

**Auth Service** triggers on changes to:
- `services/auth-service/**`
- `packages/types/**`
- `.github/workflows/ci-auth-service.yml`

**Web Test** triggers on changes to:
- `apps/web-test/**`
- `packages/types/**`
- `.github/workflows/ci-web-test.yml`

## ArgoCD Integration

ArgoCD watches Harbor registry for new images and deploys:

1. CI pushes image with tag: `develop-a1b2c3d`
2. ArgoCD detects new image
3. ArgoCD updates Helm release in target namespace
4. Kubernetes rolls out new pods

## Git Flow → Environment Mapping

| Git Branch | CI Tag | ArgoCD App | K8s Namespace | Environment |
|------------|--------|------------|---------------|-------------|
| develop | develop:*, develop:latest | my-girok-dev | my-girok-dev | Development |
| release/* | release:*, release:latest | my-girok-staging | my-girok-staging | Staging |
| main | latest | my-girok-prod | my-girok-prod | Production |

## Testing Before CI

**Local build test:**
```bash
# Auth Service
docker build \
  -t test/auth-service:local \
  -f services/auth-service/Dockerfile \
  .

# Web Test
docker build \
  --build-arg VITE_API_URL=https://auth-api-dev.girok.dev/api/v1 \
  -t test/web-test:local \
  -f apps/web-test/Dockerfile \
  .
```

## Troubleshooting

**CI build fails:**
- Check test results in GitHub Actions logs
- Verify Harbor credentials in GitHub Secrets
- Check Dockerfile syntax

**Image not pushed:**
- Verify Harbor robot account has push permissions
- Check network connectivity to Harbor
- Verify project name matches: `my-girok`

**ArgoCD not deploying:**
- Check ArgoCD application configuration
- Verify image pull secrets in Kubernetes
- Check ArgoCD sync policy

## Manual Harbor Push

```bash
# Login
docker login harbor.girok.dev \
  -u 'robot$my-girok+ci-builder' \
  -p '<token>'

# Tag
docker tag local-image:latest \
  harbor.girok.dev/my-girok/auth-service:develop-manual

# Push
docker push harbor.girok.dev/my-girok/auth-service:develop-manual
```
