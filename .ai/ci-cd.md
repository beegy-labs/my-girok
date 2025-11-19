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
- **File**: `.github/workflows/ci-web-main.yml`
- **Triggers**: Push to develop, release/*, main (when web-main changes)
- **Steps**: Parallel (Lint + Type-check + Test) → Build (with API URL) → Push to Harbor
- **Optimization**: 3 parallel jobs with node_modules caching (~3-5min total)

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
harbor.girok.dev/my-girok/web-main:develop:a1b2c3d
harbor.girok.dev/my-girok/web-main:develop:latest
harbor.girok.dev/my-girok/web-main:release:a1b2c3d
harbor.girok.dev/my-girok/web-main:release:latest
harbor.girok.dev/my-girok/web-main:latest
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

**Update in**: `.github/workflows/ci-web-main.yml`

## Workflow Trigger Paths

**Auth Service** triggers on changes to:
- `services/auth-service/**`
- `packages/types/**`
- `.github/workflows/ci-auth-service.yml`

**Web Test** triggers on changes to:
- `apps/web-main/**`
- `packages/types/**`
- `.github/workflows/ci-web-main.yml`

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
  -t test/web-main:local \
  -f apps/web-main/Dockerfile \
  .
```

## Performance Optimization

### Web-Main CI Optimization (2025-11-19)

**Before**: ~10 minutes (sequential jobs)
**After**: ~3-5 minutes (parallel jobs with caching)

**Strategy**:
1. **Parallel Job Execution**: Split single test job into 3 parallel jobs:
   - `lint`: ESLint checks
   - `type-check`: TypeScript compilation
   - `test`: Vitest unit tests
   - `build`: Depends on all 3 jobs, runs only if all pass

2. **Node Modules Caching**: Cache `node_modules` across jobs
   ```yaml
   - name: Setup node_modules cache
     uses: actions/cache@v4
     with:
       path: |
         node_modules
         apps/web-main/node_modules
       key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
   ```

3. **Fast Installation**: Use `--prefer-offline` flag
   ```yaml
   - name: Install dependencies
     run: pnpm install --frozen-lockfile --prefer-offline
   ```

**Results**:
- **2-3x faster** CI pipeline
- Better failure detection (fail fast on specific check)
- Efficient resource usage (parallel execution)

### General CI Best Practices

1. **Use caching**: Cache dependencies (node_modules, cargo, go modules)
2. **Parallelize**: Run independent checks in parallel
3. **Fail fast**: Use `needs` to stop downstream jobs on failure
4. **Cache keys**: Use lock file hashes for cache keys

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
