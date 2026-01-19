# GitHub Actions Workflows Policy

```yaml
updated: 2026-01-12
status: Active
location: .github/workflows/
```

## Architecture

### Reusable Templates

| Template          | Purpose          | File              |
| ----------------- | ---------------- | ----------------- |
| `_service-ci.yml` | Backend services | `_service-ci.yml` |
| `_web-ci.yml`     | Web applications | `_web-ci.yml`     |

**Convention**: Templates start with `_` prefix

### Service Workflow Pattern

Each service calls reusable template with configuration:

```yaml
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

## Template Parameters

### Backend Service (`_service-ci.yml`)

| Parameter            | Description               | Example               | Required |
| -------------------- | ------------------------- | --------------------- | -------- |
| `service_name`       | Service name              | `auth-bff`            | ✅       |
| `service_path`       | Path from repo root       | `services/auth-bff`   | ✅       |
| `image_name`         | Docker image name         | `beegy-labs/auth-bff` | ✅       |
| `gitops_file_prefix` | GitOps values file prefix | `my-girok-auth-bff`   | ✅       |
| `needs_prisma`       | Run Prisma generate       | `false`               | ❌       |
| `pnpm_filter`        | pnpm workspace filter     | `@my-girok/auth-bff`  | ✅       |

### Web App (`_web-ci.yml`)

| Parameter            | Description          | Example                | Required |
| -------------------- | -------------------- | ---------------------- | -------- |
| `app_name`           | App name             | `web-admin`            | ✅       |
| `app_path`           | Path from repo root  | `apps/web-admin`       | ✅       |
| `image_name`         | Docker image name    | `beegy-labs/web-admin` | ✅       |
| `gitops_file_prefix` | GitOps values prefix | `my-girok-web-admin`   | ✅       |
| `build_args`         | Docker build args    | `VITE_API_URL=...`     | ❌       |

## Pipeline Stages

### 1. Check (Quality Assurance)

```yaml
runs_on: All PRs and pushes
timeout: 60 minutes

steps:
  - Checkout code
  - Setup Node.js 24 + pnpm
  - Restore pnpm cache (with fallback keys)
  - Install dependencies
  - Build types package
  - Generate Prisma client (if needed)
  - Build nest-common package
  - Run tests and linting (parallel)

optimization: pnpm cache with restore-keys
```

### 2. Build (Docker Image)

```yaml
runs_on: Push to develop/release/main only (NOT PRs)
condition: github.event_name == 'push' && contains(['develop', 'release', 'main'], github.ref_name)
timeout: 60 minutes

steps:
  - Checkout code
  - Setup Docker Buildx
  - Login to Gitea registry
  - Generate metadata from branch (github.ref_name)
  - Check if image exists (optimization)
  - Build and push (skip if exists)
  - Use registry cache

optimization: Skip build if image exists
routing: Environment auto-detected from github.ref_name
```

### 3. Deploy (GitOps Update)

```yaml
runs_on: After successful build
condition: always() && needs.build.result == 'success'
timeout: 60 minutes

steps:
  - Checkout GitOps repository
  - Update image tag in values file
  - Commit and push (with retry: 3 attempts, rebase on conflict)
  - Cleanup old images (keep last 10)
```

## Proto Build Caching

**Workflow**: `.github/workflows/build-proto.yml`

**Strategy**: Build once, download many (avoid Buf Schema Registry rate limits)

### Process

1. Calculate SHA256 hash of proto files (first 12 chars)
2. Check Gitea for existing package
3. Build and upload if missing
4. Service CI downloads pre-built package

### Performance

| Metric           | Before     | After      | Improvement    |
| ---------------- | ---------- | ---------- | -------------- |
| Proto generation | 450s (×10) | 33s (×1)   | 93% reduction  |
| Proto download   | N/A        | 150s (×10) | -              |
| Total CI time    | 450s       | 183s       | **59% faster** |
| Cache hit        | 450s       | 150s       | **67% faster** |

**Package size**: ~100KB (gzip)

**Hash calculation**:

```bash
find packages/proto -type f \( -name "*.proto" -o -name "buf.gen.yaml" -o -name "buf.yaml" \) \
  -exec sha256sum {} \; | sort | sha256sum | cut -c1-12
```

**Reference**: `docs/llm/policies/proto-caching.md`

## Optimizations

### 1. Image Existence Check

```bash
curl -s "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/${SERVICE}/${TAG}"
if [ response == 200 ]; then skip_build; fi
```

### 2. pnpm Cache

```yaml
key: ${{ runner.os }}-pnpm-${SERVICE}-${{ hashFiles('**/pnpm-lock.yaml') }}
restore-keys: |
  ${{ runner.os }}-pnpm-${SERVICE}-
  ${{ runner.os }}-pnpm-
```

### 3. Docker Layer Cache

```yaml
cache-from: type=registry,ref=${IMAGE}:buildcache
cache-to: type=registry,ref=${IMAGE}:buildcache,mode=max
```

### 4. Parallel Execution

- Tests: 8 parallel workers (vitest)
- Web apps: Lint + type-check parallel

### 5. Conditional Execution

- Build: Only on push to main branches (not PRs)
- Deploy: Only after successful build
- Bundle analysis: Only on PRs (web apps)

## Image Tagging

**Environment**: Auto-detected from `github.ref_name`

| Branch  | Tag Format             | Additional Tags          | Environment |
| ------- | ---------------------- | ------------------------ | ----------- |
| main    | `${SHORT_SHA}`         | `latest`                 | Production  |
| develop | `develop-${SHORT_SHA}` | `develop-latest/develop` | Development |
| release | `release-${SHORT_SHA}` | `release`                | Staging     |

**SHORT_SHA**: First 7 chars of commit SHA

## GitOps Integration

### File Naming

| Environment | Pattern                                       |
| ----------- | --------------------------------------------- |
| Production  | `clusters/home/values/${PREFIX}-prod.yaml`    |
| Development | `clusters/home/values/${PREFIX}-dev.yaml`     |
| Staging     | `clusters/home/values/${PREFIX}-staging.yaml` |

### Update Process

1. Clone GitOps repo
2. Update `tag: "..."` in values file
3. Commit: `chore(${ENV}): update ${SERVICE} to ${TAG}`
4. Push with retry (3 attempts, rebase on conflict)

## Image Cleanup

**Policy**: Keep last 10 images per environment prefix

```bash
curl "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/${SERVICE}" | \
  jq ".[] | select(.version | startswith(\"${PREFIX}\"))" | \
  sort -r | tail -n +11 | \
  while read version; do DELETE; done
```

## Secrets

| Secret           | Description                | Used By       |
| ---------------- | -------------------------- | ------------- |
| `GITEA_USERNAME` | Gitea registry username    | Build         |
| `GITEA_TOKEN`    | Gitea registry & API token | Build, Deploy |
| `GITOPS_PAT`     | GitOps repo access token   | Deploy        |

## Performance Metrics

### Target Benchmarks

- Check: <5 min (with cache)
- Build: <10 min (with cache)
- Deploy: <2 min
- Total CI: <20 min (develop, cached)

### Actual Performance

- PR validation: 2-3 min (check only)
- Full pipeline: 15-20 min (including queue)
- Rebuild (no change): <1 min (image exists, skip)

**Note**: 60-min timeout accommodates KEDA auto-scaling and queue times

## Adding New Service

1. Create workflow: `.github/workflows/ci-{service}.yml`
2. Use template: `_service-ci.yml` or `_web-ci.yml`
3. Configure parameters
4. Environment routing: Automatic from branch name

**Example**:

```yaml
name: CI - New Service
on:
  push:
    branches: [develop, release, main]
    paths: ['services/new-service/**', 'packages/**', 'pnpm-lock.yaml']
  pull_request:
    branches: [develop, release, main]
    paths: ['services/new-service/**', 'packages/**', 'pnpm-lock.yaml']

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
    secrets: inherit
```

## Troubleshooting

| Issue         | Solution                                         |
| ------------- | ------------------------------------------------ |
| Build skipped | Check branch (develop/release/main), verify push |
| Deploy failed | Verify GITOPS_PAT, check file path, review logs  |
| Cache miss    | Verify key pattern, check restore-keys           |
| Timeout       | Check test performance, review KEDA scaling      |

## References

- [Git Flow](../../.ai/git-flow.md)
- [Proto Caching](proto-caching.md)
- [Test Coverage](../../test-coverage.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
