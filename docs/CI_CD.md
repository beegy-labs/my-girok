# CI/CD Pipeline Documentation

Complete guide for the My-Girok CI/CD pipeline using GitHub Actions, Harbor, and ArgoCD.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [GitHub Actions CI](#github-actions-ci)
- [Harbor Registry](#harbor-registry)
- [ArgoCD Deployment](#argocd-deployment)
- [Setup Guide](#setup-guide)
- [Troubleshooting](#troubleshooting)

## Overview

### CI/CD Stack

- **Source Control**: GitHub
- **CI**: GitHub Actions
- **Container Registry**: Harbor (harbor.girok.dev)
- **CD**: ArgoCD
- **Orchestration**: Kubernetes

### Workflow

```
Developer Push → GitHub Actions → Harbor → ArgoCD → Kubernetes
```

1. Developer pushes code to GitHub
2. GitHub Actions runs tests and builds Docker images
3. Images pushed to Harbor registry
4. ArgoCD detects new images
5. ArgoCD deploys to Kubernetes cluster

## Architecture

### Git Flow Integration

```
┌─────────────┐
│   develop   │ → develop-abc123 → dev namespace
└─────────────┘

┌─────────────┐
│  release/*  │ → release-abc123 → staging namespace
└─────────────┘

┌─────────────┐
│     main    │ → latest → production namespace
└─────────────┘
```

### Image Flow

```
┌──────────────────┐
│  GitHub Actions  │
│   (Build & Test) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Harbor Registry │
│ (Image Storage)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     ArgoCD       │
│  (GitOps CD)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Kubernetes     │
│   (Runtime)      │
└──────────────────┘
```

## GitHub Actions CI

### Workflows

#### 1. Auth Service CI (`.github/workflows/ci-auth-service.yml`)

**Triggers:**
- Push to `develop`, `release/**`, `main`
- Only when files change in:
  - `services/auth-service/**`
  - `packages/types/**`
  - `.github/workflows/ci-auth-service.yml`

**Jobs:**

**Test Job:**
1. Checkout code
2. Setup Node.js 22 & pnpm 9
3. Cache pnpm store
4. Install dependencies
5. Run unit tests
6. Run linter

**Build Job:**
1. Checkout code
2. Setup Docker Buildx
3. Login to Harbor
4. Determine tag based on branch
5. Build Docker image
6. Push to Harbor

**Tags:**
- `develop` → `harbor.girok.dev/my-girok/auth-service:develop:<hash>` + `develop:latest`
- `release/*` → `harbor.girok.dev/my-girok/auth-service:release:<hash>` + `release:latest`
- `main` → `harbor.girok.dev/my-girok/auth-service:latest`

#### 2. Web Test CI (`.github/workflows/ci-web-main.yml`)

**Triggers:**
- Push to `develop`, `release/**`, `main`
- Only when files change in:
  - `apps/web-main/**`
  - `packages/types/**`
  - `.github/workflows/ci-web-main.yml`

**Jobs:**

**Lint Job** (runs in parallel):
1. Checkout code
2. Setup Node.js 22 & pnpm 9
3. Cache node_modules (faster than pnpm store)
4. Install dependencies with `--prefer-offline`
5. Run ESLint

**Type-Check Job** (runs in parallel):
1. Checkout code
2. Setup Node.js 22 & pnpm 9
3. Cache node_modules
4. Install dependencies with `--prefer-offline`
5. Run TypeScript compiler

**Test Job** (runs in parallel):
1. Checkout code
2. Setup Node.js 22 & pnpm 9
3. Cache node_modules
4. Install dependencies with `--prefer-offline`
5. Run Vitest unit tests

**Build Job** (runs after all parallel jobs pass):
1. Wait for lint, type-check, and test jobs
2. Checkout code
3. Setup Docker Buildx
4. Login to Harbor
5. Determine environment and API URL
6. Build Docker image with API URL
7. Push to Harbor

**Performance**: ~3-5 minutes total (2-3x faster than sequential execution)

**Environment-Specific API URLs:**
- `develop` → `https://auth-api-dev.girok.dev/api/v1`
- `release/*` → `https://auth-api-staging.girok.dev/api/v1`
- `main` → `https://auth-api.girok.dev/api/v1`

**Important**: Vite requires API URL at build time, not runtime!

### Image Tagging Strategy

| Branch Pattern | Tag Format | Example | Use Case |
|---------------|------------|---------|----------|
| `develop` | `develop:<short-sha>` + `develop:latest` | `develop:a1b2c3d`, `develop:latest` | Development testing |
| `release/*` | `release:<short-sha>` + `release:latest` | `release:e4f5g6h`, `release:latest` | QA/Staging |
| `main` | `latest` | `latest` | Production |

### Caching Strategy

**Node Modules Cache (Web-Main - Optimized 2025-11-19):**
- Key: `${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}`
- Paths:
  - `node_modules`
  - `apps/web-main/node_modules`
- Benefits: Faster than pnpm store cache, 2-3x CI speedup
- Used with `pnpm install --frozen-lockfile --prefer-offline`

**pnpm Store Cache (Auth Service):**
- Key: `${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}`
- Speeds up dependency installation

**Docker Build Cache:**
- Type: Registry cache
- Location: `harbor.girok.dev/my-girok/<service>:buildcache`
- Mode: `max` (cache all layers)

## Harbor Registry

### Registry Information

- **URL**: `harbor.girok.dev`
- **Protocol**: HTTPS
- **Project**: `my-girok`

### Repositories

```
harbor.girok.dev/my-girok/auth-service
harbor.girok.dev/my-girok/web-main
```

### Robot Account

**Purpose**: Automated CI/CD authentication

**Permissions:**
- ✅ Push Artifact
- ✅ Pull Artifact

**Format:**
- Username: `robot$my-girok+ci-builder`
- Password: JWT token (from Harbor UI)

**Creation Steps:**

1. Login to Harbor UI
2. Navigate to `my-girok` project
3. Click "Robot Accounts" tab
4. Click "New Robot Account"
5. Set name: `ci-builder`
6. Set expiration: Never (or as needed)
7. Check permissions: Push & Pull Artifact
8. Copy token (shown only once!)

### Image Retention Policy (Recommended)

```yaml
# Keep only recent images to save storage
Rules:
  - Tag pattern: develop-*
    Retention: 10 most recent
  - Tag pattern: release-*
    Retention: 20 most recent
  - Tag pattern: latest
    Retention: Always keep
```

### Vulnerability Scanning

Harbor can automatically scan images:

1. Project Settings → Configuration
2. Enable "Automatically scan images on push"
3. Set severity threshold (e.g., Critical, High)
4. Prevent vulnerable images from deployment

## ArgoCD Deployment

### Application Structure

```yaml
# ArgoCD Application for auth-service (development)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-girok-auth-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/my-girok
    targetRevision: develop
    path: services/auth-service/helm
    helm:
      valueFiles:
        - values.yaml
      parameters:
        - name: image.tag
          value: develop-abc1234  # Updated by ArgoCD Image Updater
  destination:
    server: https://kubernetes.default.svc
    namespace: my-girok-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### ArgoCD Image Updater

Automatically update image tags when new images are pushed:

```yaml
# Annotation on ArgoCD Application
annotations:
  argocd-image-updater.argoproj.io/image-list: myimage=harbor.girok.dev/my-girok/auth-service
  argocd-image-updater.argoproj.io/myimage.update-strategy: digest
  argocd-image-updater.argoproj.io/myimage.allow-tags: regexp:^develop-.*$
```

### Environment Mapping

| Environment | Branch | ArgoCD App | Namespace | Sync Policy |
|-------------|--------|------------|-----------|-------------|
| Development | develop | my-girok-*-dev | my-girok-dev | Auto |
| Staging | release/* | my-girok-*-staging | my-girok-staging | Manual |
| Production | main | my-girok-*-prod | my-girok-prod | Manual |

**Auto Sync**: Automatically deploys when image tag changes
**Manual Sync**: Requires manual approval in ArgoCD UI

## Setup Guide

### 1. Harbor Setup

#### Create Project

```bash
# Via Harbor UI
1. Login to https://harbor.girok.dev
2. Click "NEW PROJECT"
3. Project Name: my-girok
4. Access Level: Private
5. Click "OK"
```

#### Create Robot Account

```bash
# Via Harbor UI
1. Go to "my-girok" project
2. Click "Robot Accounts"
3. Click "NEW ROBOT ACCOUNT"
4. Name: ci-builder
5. Expiration: Never
6. Permissions:
   - Push Artifact: ✅
   - Pull Artifact: ✅
7. Click "ADD"
8. COPY TOKEN (shown only once!)
```

### 2. GitHub Secrets Setup

```bash
# GitHub Repository → Settings → Secrets and variables → Actions

# Add Repository Secrets:
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<paste-robot-token-here>
```

### 3. Kubernetes ImagePullSecret

```bash
# Create secret in each namespace
kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<robot-token>' \
  --namespace=my-girok-dev

kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<robot-token>' \
  --namespace=my-girok-staging

kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<robot-token>' \
  --namespace=my-girok-prod
```

### 4. Update Helm Values

```yaml
# services/auth-service/helm/values.yaml
# apps/web-main/helm/values.yaml

image:
  repository: harbor.girok.dev/my-girok/auth-service
  pullPolicy: IfNotPresent
  tag: ""

imagePullSecrets:
  - name: harbor-regcred
```

### 5. ArgoCD Setup

```bash
# Install ArgoCD (if not already installed)
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Install ArgoCD Image Updater
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml

# Add Harbor credentials to ArgoCD
kubectl create secret generic harbor-credentials \
  --from-literal=username='robot$my-girok+ci-builder' \
  --from-literal=password='<robot-token>' \
  --namespace=argocd
```

### 6. Test CI Pipeline

```bash
# Make a test change
cd services/auth-service
echo "# Test CI" >> README.md

# Commit and push to develop
git checkout develop
git add .
git commit -m "test: trigger CI pipeline"
git push origin develop

# Watch GitHub Actions
# https://github.com/your-org/my-girok/actions

# Check Harbor for new image
# https://harbor.girok.dev/harbor/projects/1/repositories
```

## Troubleshooting

### GitHub Actions Failures

#### Build Fails: "Cannot connect to Harbor"

**Symptom:**
```
Error: Cannot perform an interactive login from a non TTY device
```

**Solution:**
1. Verify GitHub Secrets are set correctly
2. Check Harbor is accessible: `curl https://harbor.girok.dev`
3. Verify robot account credentials

#### Build Fails: "Permission denied"

**Symptom:**
```
Error: denied: requested access to the resource is denied
```

**Solution:**
1. Check robot account has Push Artifact permission
2. Verify project name is correct: `my-girok`
3. Check image name format: `harbor.girok.dev/my-girok/<service>`

#### Test Fails

**Solution:**
1. Check test logs in GitHub Actions
2. Run tests locally: `cd services/auth-service && pnpm test`
3. Fix failing tests before pushing

### Harbor Issues

#### Cannot Login to Harbor

**Solution:**
```bash
# Test robot account
docker login harbor.girok.dev \
  -u 'robot$my-girok+ci-builder' \
  -p '<token>'

# Check token hasn't expired
# Regenerate token in Harbor UI if needed
```

#### Image Not Found

**Solution:**
1. Check image was pushed successfully in GitHub Actions
2. Verify image name and tag in Harbor UI
3. Check repository permissions

### ArgoCD Issues

#### Application Out of Sync

**Solution:**
1. Check ArgoCD UI for sync status
2. Click "Sync" manually if auto-sync disabled
3. Check for Helm value errors

#### Cannot Pull Image

**Symptom:**
```
Failed to pull image: harbor.girok.dev/my-girok/auth-service:develop-abc123
```

**Solution:**
1. Verify ImagePullSecret exists in namespace
2. Check secret has correct Harbor credentials
3. Test image pull manually:
```bash
kubectl run test-pull \
  --image=harbor.girok.dev/my-girok/auth-service:develop-abc123 \
  --image-pull-policy=Always \
  --namespace=my-girok-dev
```

#### Image Tag Not Updating

**Solution:**
1. Check ArgoCD Image Updater is running
2. Verify image tag pattern matches regex in annotations
3. Check ArgoCD Image Updater logs:
```bash
kubectl logs -n argocd \
  -l app.kubernetes.io/name=argocd-image-updater
```

## Performance Optimization

### Web-Main CI Optimization (2025-11-19)

**Problem**: Original CI pipeline took ~10 minutes due to sequential execution and slow dependency installation.

**Solution**: Implemented parallel job execution with optimized caching.

#### Changes

**1. Parallel Job Execution**

Split monolithic test job into 3 independent parallel jobs:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    # Runs ESLint checks

  type-check:
    runs-on: ubuntu-latest
    # Runs TypeScript compiler

  test:
    runs-on: ubuntu-latest
    # Runs Vitest unit tests

  build:
    needs: [lint, type-check, test]
    # Only runs if all 3 jobs pass
```

**Benefits**:
- Jobs run concurrently instead of sequentially
- Fail fast - build doesn't run if any check fails
- Better resource utilization

**2. Node Modules Caching**

Switched from pnpm store cache to direct node_modules cache:

```yaml
- name: Setup node_modules cache
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      apps/web-main/node_modules
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**Benefits**:
- Faster than pnpm store cache (no extraction needed)
- Cache hit = instant dependency availability
- Consistent across all parallel jobs

**3. Offline Installation**

Use `--prefer-offline` flag with pnpm:

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile --prefer-offline
```

**Benefits**:
- Uses cached packages when available
- Only downloads missing packages
- Significantly faster with cache hit

#### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Time** | ~10 minutes | ~3-5 minutes | **2-3x faster** |
| **Lint** | Part of sequential | ~1-2 min (parallel) | Faster feedback |
| **Type Check** | Part of sequential | ~1-2 min (parallel) | Faster feedback |
| **Tests** | ~8-9 min (E2E) | ~1-2 min (unit) | **4-5x faster** |
| **Cache Hit Rate** | ~70% | ~95% | Better caching |

#### Best Practices Applied

1. **Parallelize Independent Tasks**: Lint, type-check, and tests don't depend on each other
2. **Cache Aggressively**: Cache entire node_modules for maximum speed
3. **Fail Fast**: Use `needs` to prevent unnecessary builds
4. **Right Tool for Job**: Unit tests instead of slow E2E tests in CI
5. **Offline First**: Prefer cached packages over network downloads

### General CI Optimization Tips

1. **Identify Bottlenecks**: Use GitHub Actions timing to find slow steps
2. **Cache Everything**: Dependencies, build artifacts, test results
3. **Parallelize**: Run independent jobs concurrently
4. **Incremental Builds**: Only rebuild what changed
5. **Right Test Type**: Unit tests in CI, E2E tests nightly or pre-release
6. **Resource Limits**: Don't over-provision runners

## Best Practices

### 1. Branch Protection

```yaml
# Require CI to pass before merge
Branch Protection Rules:
  - require status checks to pass
  - require CI - Auth Service to pass
  - require CI - Web Test to pass
```

### 2. Image Tagging

- ✅ Use immutable tags (with commit hash)
- ❌ Don't rely only on `latest`
- ✅ Keep semantic versioning for production (`v1.0.0`)

### 3. Secrets Management

- ✅ Use GitHub Secrets for CI credentials
- ✅ Use Kubernetes Secrets for runtime credentials
- ✅ Rotate credentials regularly
- ❌ Never commit secrets to Git

### 4. Testing

- ✅ Run tests before building images
- ✅ Fail fast on test failures
- ✅ Include linting and type checking

### 5. Monitoring

- ✅ Monitor GitHub Actions run times
- ✅ Set up Harbor webhook notifications
- ✅ Monitor ArgoCD application health
- ✅ Set up alerts for failed deployments

## Resources

- **GitHub Actions**: https://docs.github.com/actions
- **Harbor**: https://goharbor.io/docs
- **ArgoCD**: https://argo-cd.readthedocs.io
- **Docker Build**: https://docs.docker.com/build

## Support

For CI/CD issues:
- Check GitHub Actions logs
- Check Harbor project logs
- Check ArgoCD application events
- GitHub Issues: https://github.com/your-org/my-girok/issues
