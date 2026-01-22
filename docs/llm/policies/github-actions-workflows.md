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

### Performance

| Metric           | Before     | After      | Improvement    |
| ---------------- | ---------- | ---------- | -------------- |
| Proto generation | 450s (×10) | 33s (×1)   | 93% reduction  |
| Proto download   | N/A        | 150s (×10) | -              |
| Total CI time    | 450s       | 183s       | **59% faster** |
| Cache hit        | 450s       | 150s       | **67% faster** |

**Reference**: `docs/llm/policies/proto-caching.md`

## Related Documentation

- **Advanced Configuration**: `github-actions-workflows-advanced.md`
- [Git Flow](../../.ai/git-flow.md)
- [Proto Caching](proto-caching.md)
