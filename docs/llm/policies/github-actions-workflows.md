# GitHub Actions Workflows Policy

> **Last Updated**: 2026-01-12 | **Status**: Active

## Overview

This document defines the GitHub Actions CI/CD workflow architecture for my-girok. All workflows use reusable workflow templates to ensure consistency, maintainability, and optimization.

## Workflow Architecture

### Reusable Workflow Templates

**Location**: `.github/workflows/`

| Template          | Purpose          | File                                |
| ----------------- | ---------------- | ----------------------------------- |
| `_service-ci.yml` | Backend services | `.github/workflows/_service-ci.yml` |
| `_web-ci.yml`     | Web applications | `.github/workflows/_web-ci.yml`     |

**Naming Convention**: Reusable workflows start with `_` prefix

### Service Workflows

**Pattern**: Each service/app has a minimal workflow file that calls the reusable template

**Example** (`ci-auth-bff.yml`):

```yaml
name: CI - Auth BFF

on:
  push:
    branches: [develop, release, main]
    paths:
      - 'services/auth-bff/**'
      - 'packages/**'
      - 'pnpm-lock.yaml'
  pull_request:
    branches: [develop, release, main]
    paths:
      - 'services/auth-bff/**'
      - 'packages/**'
      - 'pnpm-lock.yaml'
  workflow_dispatch:
    inputs:
      deploy_env:
        description: 'Deploy environment'
        required: false
        default: 'develop'
        type: choice
        options:
          - develop
          - release
          - main

jobs:
  ci:
    uses: ./.github/workflows/_service-ci.yml
    with:
      service_name: auth-bff
      service_path: services/auth-bff
      image_name: beegy-labs/auth-bff
      gitops_file_prefix: my-girok-auth-bff
      needs_prisma: false
      pnpm_filter: '@my-girok/auth-bff'
    secrets:
      GITEA_USERNAME: ${{ secrets.GITEA_USERNAME }}
      GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
      GITOPS_PAT: ${{ secrets.GITOPS_PAT }}
```

## Reusable Workflow Parameters

### Backend Service Template (`_service-ci.yml`)

| Parameter            | Description                    | Example               | Required |
| -------------------- | ------------------------------ | --------------------- | -------- |
| `service_name`       | Service name                   | `auth-bff`            | ✅       |
| `service_path`       | Path relative to repo root     | `services/auth-bff`   | ✅       |
| `image_name`         | Docker image name              | `beegy-labs/auth-bff` | ✅       |
| `gitops_file_prefix` | GitOps values file prefix      | `my-girok-auth-bff`   | ✅       |
| `needs_prisma`       | Whether to run Prisma generate | `false`               | ❌       |
| `pnpm_filter`        | pnpm workspace filter          | `@my-girok/auth-bff`  | ✅       |

### Web App Template (`_web-ci.yml`)

| Parameter            | Description                        | Example                | Required |
| -------------------- | ---------------------------------- | ---------------------- | -------- |
| `app_name`           | App name                           | `web-admin`            | ✅       |
| `app_path`           | Path relative to repo root         | `apps/web-admin`       | ✅       |
| `image_name`         | Docker image name                  | `beegy-labs/web-admin` | ✅       |
| `gitops_file_prefix` | GitOps values file prefix          | `my-girok-web-admin`   | ✅       |
| `build_args`         | Docker build arguments (multiline) | `VITE_API_URL=...`     | ❌       |

## CI/CD Pipeline Stages

### Stage 1: Check (Quality Assurance)

- **Runs on**: All PRs and pushes
- **Timeout**: 60 minutes
- **Steps**:
  1. Checkout code
  2. Setup Node.js 24 + pnpm
  3. Restore pnpm cache (with fallback keys)
  4. Install dependencies
  5. Build types package
  6. Generate Prisma client (if needed)
  7. Build nest-common package
  8. Run tests and linting in parallel
- **Optimization**: pnpm cache with restore-keys for faster installs

### Stage 2: Build (Docker Image)

- **Runs on**: Push to develop/release/main branches only (NOT on PRs)
- **Condition**: `github.event_name == 'push' && contains(fromJSON('["develop", "release", "main"]'), github.ref_name)`
- **Timeout**: 60 minutes
- **Steps**:
  1. Checkout code
  2. Setup Docker Buildx
  3. Login to Gitea registry
  4. Generate image metadata from branch name (`github.ref_name`)
     - Tag format determined automatically by branch
     - No manual environment selection needed
  5. **Check if image already exists in Gitea** (optimization)
  6. Build and push Docker image (skip if exists)
  7. Use registry cache for faster builds
- **Optimization**: Skip build if image already exists
- **Branch-based routing**: Environment automatically selected by `github.ref_name`

### Stage 3: Deploy (GitOps Update)

- **Runs on**: After successful build
- **Condition**: `always() && needs.build.result == 'success'`
- **Timeout**: 60 minutes
- **Steps**:
  1. Checkout GitOps repository
  2. Update image tag in values file
  3. Commit and push changes (with retry logic)
  4. Cleanup old images (keep last 10)
- **Retry Logic**: 3 attempts with rebase on conflicts

## Proto Build Caching

### Strategy

**Build Once, Download Many** - Pre-build proto files and cache in Gitea Generic Package Registry to avoid Buf Schema Registry rate limits and improve CI performance.

**Workflow**: `.github/workflows/build-proto.yml`

### Architecture

1. **Hash Calculation**: SHA256 of proto source files (first 12 chars)
2. **Package Check**: Query Gitea for existing package
3. **Conditional Build**: Generate and upload only if package missing
4. **Service Download**: All service CI jobs download pre-built package

### Performance Impact

| Metric           | Before               | After                | Improvement    |
| ---------------- | -------------------- | -------------------- | -------------- |
| Proto generation | 45s × 10 jobs = 450s | 33s × 1 job = 33s    | 93% reduction  |
| Proto download   | N/A                  | 15s × 10 jobs = 150s | -              |
| Total CI time    | 450s                 | 183s                 | **59% faster** |
| Cache hit        | 450s                 | 150s                 | **67% faster** |

**Package size**: ~100KB (gzip-compressed)

### Implementation

**Hash Calculation** (deterministic, reproducible):

```bash
HASH=$(find packages/proto -type f \( -name "*.proto" -o -name "buf.gen.yaml" -o -name "buf.yaml" \) \
  -exec sha256sum {} \; | sort | sha256sum | cut -c1-12)
```

**Download in Service CI** (`.github/workflows/_service-ci.yml`):

```yaml
- name: Download proto files
  env:
    GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
  run: |
    HASH=$(find packages/proto -type f \( -name "*.proto" -o -name "buf.gen.yaml" -o -name "buf.yaml" \) \
      -exec sha256sum {} \; | sort | sha256sum | cut -c1-12)

    mkdir -p packages/types/src/generated
    curl -f -L \
      -H "Authorization: token ${GITEA_TOKEN}" \
      "https://gitea.girok.dev/api/packages/beegy-labs/generic/proto-generated/${HASH}/proto-generated.tar.gz" \
      -o /tmp/proto-generated.tar.gz

    tar -xzf /tmp/proto-generated.tar.gz -C packages/types/src/generated/
```

**Gitea API**: `/api/packages/{owner}/generic/{package}/{version}/{filename}`

**Full details**: `docs/llm/policies/proto-caching.md`

## Optimization Strategies

### 1. Image Existence Check

**Before building**, check if image with same SHA already exists in Gitea:

```bash
TAG="${{ steps.meta.outputs.tag }}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/${SERVICE_NAME}/${TAG}")
if [ "$RESPONSE" = "200" ]; then
  echo "exists=true" >> $GITHUB_OUTPUT
  echo "✅ Image ${TAG} already exists, skipping build"
else
  echo "exists=false" >> $GITHUB_OUTPUT
  echo "🔨 Image ${TAG} not found, proceeding with build"
fi
```

**Docker build step** then uses:

```yaml
- uses: docker/build-push-action@v5
  if: steps.check_image.outputs.exists != 'true'
```

### 2. pnpm Cache with Restore Keys

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: ${{ runner.os }}-pnpm-${SERVICE}-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-${SERVICE}-
      ${{ runner.os }}-pnpm-
```

### 3. Docker Layer Caching

```yaml
cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

### 4. Parallel Test Execution

- Tests run with **8 parallel workers** (configured in vitest.config.mts)
- Lint and type-check run in parallel for web apps

### 5. Conditional Execution

- **Build stage**: Only on push to main branches (not PRs)
- **Deploy stage**: Only after successful build
- **Bundle analysis**: Only on PRs (web apps)

## Image Tagging Strategy

**Environment Detection**: Automatically determined by branch name (`github.ref_name`)

| Branch  | Tag Format             | Additional Tags                                   | Environment |
| ------- | ---------------------- | ------------------------------------------------- | ----------- |
| main    | `${SHORT_SHA}`         | `latest`                                          | Production  |
| develop | `develop-${SHORT_SHA}` | `develop-latest` (services)<br>`develop` (legacy) | Development |
| release | `release-${SHORT_SHA}` | `release`                                         | Staging     |

**SHORT_SHA**: First 7 characters of commit SHA

**Note**: Web apps use `latest` tag for main branch instead of SHA

## GitOps Integration

### File Naming Convention

| Environment | File Pattern                                  |
| ----------- | --------------------------------------------- |
| Production  | `clusters/home/values/${PREFIX}-prod.yaml`    |
| Development | `clusters/home/values/${PREFIX}-dev.yaml`     |
| Staging     | `clusters/home/values/${PREFIX}-staging.yaml` |

### Update Process

1. Clone GitOps repository
2. Update `tag: "..."` in values file
3. Commit with message: `chore(${ENV}): update ${SERVICE} to ${TAG}`
4. Push with retry logic (handles concurrent updates)

## Image Cleanup

**Policy**: Keep last 10 images per environment prefix

**Implementation**:

```bash
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/${SERVICE}" | \
  jq -r ".[] | select(.version | startswith(\"${PREFIX}\")) | \"\(.created_at)|\(.version)\"" | \
  sort -r | tail -n +11 | \
  while IFS='|' read -r _ v; do
    curl -sX DELETE -H "Authorization: token ${GITEA_TOKEN}" \
      "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/${SERVICE}/${v}"
  done
```

## Timeouts

| Stage  | Timeout | Rationale                           |
| ------ | ------- | ----------------------------------- |
| Check  | 60 min  | Accommodate parallel tests + queue  |
| Build  | 60 min  | Docker build + potential queue wait |
| Deploy | 60 min  | GitOps update + retry logic         |

**Note**: 60-minute timeout accommodates KEDA auto-scaling (up to 6 runners) and queue wait times

## Secrets Management

| Secret           | Description                    | Used By       |
| ---------------- | ------------------------------ | ------------- |
| `GITEA_USERNAME` | Gitea registry username        | Build         |
| `GITEA_TOKEN`    | Gitea registry & API token     | Build, Deploy |
| `GITOPS_PAT`     | GitOps repository access token | Deploy        |

## Adding a New Service

1. **Create workflow file**: `.github/workflows/ci-{service-name}.yml`
2. **Use template**:
   - Backend: `uses: ./.github/workflows/_service-ci.yml`
   - Web app: `uses: ./.github/workflows/_web-ci.yml`
3. **Configure parameters**: service_name, paths, Prisma needs, etc.
4. **Test locally**: Trigger manually via workflow_dispatch (optional, for testing)
5. **Environment routing**: Automatic based on branch name (no configuration needed)

### Example (New Backend Service)

```yaml
name: CI - New Service

on:
  push:
    branches: [develop, release, main]
    paths:
      - 'services/new-service/**'
      - 'packages/**'
      - 'pnpm-lock.yaml'
  pull_request:
    branches: [develop, release, main]
    paths:
      - 'services/new-service/**'
      - 'packages/**'
      - 'pnpm-lock.yaml'
  workflow_dispatch: # Optional: for manual testing
    inputs:
      deploy_env:
        description: 'Deploy environment'
        required: false
        default: 'develop'
        type: choice
        options:
          - develop
          - release
          - main

jobs:
  ci:
    uses: ./.github/workflows/_service-ci.yml
    with:
      service_name: new-service
      service_path: services/new-service
      image_name: beegy-labs/new-service
      gitops_file_prefix: my-girok-new-service
      needs_prisma: true
      pnpm_filter: '@my-girok/new-service'
    secrets:
      GITEA_USERNAME: ${{ secrets.GITEA_USERNAME }}
      GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
      GITOPS_PAT: ${{ secrets.GITOPS_PAT }}
```

**Note**: `workflow_dispatch.inputs.deploy_env` is for UI only and not used by reusable workflow. Environment is auto-detected from branch name.

## Troubleshooting

### Build Skipped Unexpectedly

- Check branch name matches `develop`, `release`, or `main`
- Verify push event (not PR)
- Check if image already exists in registry (optimization)

### Deploy Failed

- Verify GITOPS_PAT has write access
- Check GitOps file path matches convention
- Review retry logic logs for conflicts

### Cache Miss

- Verify cache key matches pattern
- Check if restore-keys are configured
- Ensure pnpm-lock.yaml is committed

### Timeout Issues

- Review test performance (should complete in <5 min)
- Check KEDA scaling (runner availability)
- Increase timeout if queue wait is consistent

## Performance Metrics

**Target benchmarks**:

- Check stage: <5 minutes (with cache)
- Build stage: <10 minutes (with cache)
- Deploy stage: <2 minutes
- Total CI time: <20 minutes (develop branch, cached)

**Actual performance** (with optimizations):

- PR validation: ~2-3 minutes (check only, no build)
- Full pipeline (push): ~15-20 minutes (including queue)
- Rebuild (no code change): <1 minute (image exists, skip build)

## References

- **CLAUDE.md**: Main entry point for AI documentation
- **Git Flow**: `.ai/git-flow.md`
- **CI/CD Architecture**: `.ai/ci-cd.md` (if exists)
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Reusable Workflows**: https://docs.github.com/en/actions/using-workflows/reusing-workflows

## Related Policies

- **Proto Caching Policy**: `docs/llm/policies/proto-caching.md` ⭐
- **Test Coverage Policy**: `docs/test-coverage.md`
- **Docker Build Policy**: (TODO)
- **GitOps Deployment**: (TODO)

---

**Policy Owner**: DevOps Team | **Review Cycle**: Quarterly
