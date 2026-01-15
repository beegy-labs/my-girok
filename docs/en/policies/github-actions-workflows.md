# GitHub Actions Workflows Policy

> **Last Updated**: 2026-01-12 | **Status**: Active

## Overview

This document defines the GitHub Actions CI/CD workflow architecture for my-girok. All workflows use reusable workflow templates to ensure consistency, maintainability, and performance optimization across all services and applications.

## Workflow Architecture

### Reusable Workflow Templates

All CI/CD workflows are built on reusable templates located in `.github/workflows/`:

| Template          | Purpose                  | File                                |
| ----------------- | ------------------------ | ----------------------------------- |
| `_service-ci.yml` | Backend NestJS services  | `.github/workflows/_service-ci.yml` |
| `_web-ci.yml`     | Web applications (React) | `.github/workflows/_web-ci.yml`     |

Reusable workflows follow the naming convention of starting with an underscore (`_`) prefix.

### Service-Specific Workflows

Each service or application has a minimal workflow file that calls the appropriate reusable template. This pattern keeps individual workflow files simple while centralizing logic in the templates.

**Example workflow file** (`ci-auth-bff.yml`):

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

| Parameter            | Description                      | Example               | Required |
| -------------------- | -------------------------------- | --------------------- | -------- |
| `service_name`       | Service identifier               | `auth-bff`            | Yes      |
| `service_path`       | Path relative to repository root | `services/auth-bff`   | Yes      |
| `image_name`         | Docker image name in registry    | `beegy-labs/auth-bff` | Yes      |
| `gitops_file_prefix` | GitOps values file prefix        | `my-girok-auth-bff`   | Yes      |
| `needs_prisma`       | Whether to run Prisma generate   | `false`               | No       |
| `pnpm_filter`        | pnpm workspace filter            | `@my-girok/auth-bff`  | Yes      |

### Web Application Template (`_web-ci.yml`)

| Parameter            | Description                        | Example                | Required |
| -------------------- | ---------------------------------- | ---------------------- | -------- |
| `app_name`           | Application identifier             | `web-admin`            | Yes      |
| `app_path`           | Path relative to repository root   | `apps/web-admin`       | Yes      |
| `image_name`         | Docker image name in registry      | `beegy-labs/web-admin` | Yes      |
| `gitops_file_prefix` | GitOps values file prefix          | `my-girok-web-admin`   | Yes      |
| `build_args`         | Docker build arguments (multiline) | `VITE_API_URL=...`     | No       |

## CI/CD Pipeline Stages

### Stage 1: Check (Quality Assurance)

This stage runs on all pull requests and pushes to ensure code quality.

**Trigger conditions**: All PRs and pushes
**Timeout**: 60 minutes

**Steps performed**:

1. Checkout source code
2. Setup Node.js 24 with pnpm
3. Restore pnpm cache (with fallback keys for partial cache hits)
4. Install dependencies
5. Build the types package
6. Generate Prisma client (if required by the service)
7. Build the nest-common package
8. Run tests and linting in parallel

### Stage 2: Build (Docker Image)

This stage builds and pushes Docker images to the container registry.

**Trigger conditions**: Push to develop, release, or main branches only (never on PRs)
**Condition**: `github.event_name == 'push' && contains(fromJSON('["develop", "release", "main"]'), github.ref_name)`
**Timeout**: 60 minutes

**Steps performed**:

1. Checkout source code
2. Setup Docker Buildx for multi-platform builds
3. Login to Gitea container registry
4. Generate image metadata from branch name
5. Check if image already exists in registry (optimization)
6. Build and push Docker image (skipped if image exists)
7. Use registry cache for faster builds

**Important**: The environment is automatically determined by the branch name (`github.ref_name`), requiring no manual configuration.

### Stage 3: Deploy (GitOps Update)

This stage updates the GitOps repository to trigger deployment.

**Trigger conditions**: After successful build
**Condition**: `always() && needs.build.result == 'success'`
**Timeout**: 60 minutes

**Steps performed**:

1. Checkout GitOps repository
2. Update image tag in values file
3. Commit and push changes (with retry logic for concurrent updates)
4. Cleanup old images (keeps last 10 per environment)

## Optimization Strategies

### 1. Image Existence Check

Before building, the workflow checks if an image with the same SHA already exists:

```bash
TAG="${{ steps.meta.outputs.tag }}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/${SERVICE_NAME}/${TAG}")
if [ "$RESPONSE" = "200" ]; then
  echo "exists=true" >> $GITHUB_OUTPUT
  echo "Image ${TAG} already exists, skipping build"
else
  echo "exists=false" >> $GITHUB_OUTPUT
  echo "Image ${TAG} not found, proceeding with build"
fi
```

The build step is then conditional:

```yaml
- uses: docker/build-push-action@v5
  if: steps.check_image.outputs.exists != 'true'
```

### 2. pnpm Cache with Restore Keys

Cache configuration includes fallback keys for partial cache hits:

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

Docker builds use registry-based caching:

```yaml
cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

### 4. Parallel Execution

- Tests run with 8 parallel workers (configured in vitest.config.mts)
- Lint and type-check run in parallel for web applications

### 5. Conditional Execution

- Build stage only runs on pushes to main branches (not on PRs)
- Deploy stage only runs after successful builds
- Bundle analysis only runs on PRs for web applications

## Image Tagging Strategy

Tags are automatically determined by the branch name:

| Branch  | Tag Format             | Additional Tags  | Environment |
| ------- | ---------------------- | ---------------- | ----------- |
| main    | `${SHORT_SHA}`         | `latest`         | Production  |
| develop | `develop-${SHORT_SHA}` | `develop-latest` | Development |
| release | `release-${SHORT_SHA}` | `release`        | Staging     |

**SHORT_SHA** is the first 7 characters of the commit SHA.

## GitOps Integration

### File Naming Convention

| Environment | File Pattern                                  |
| ----------- | --------------------------------------------- |
| Production  | `clusters/home/values/${PREFIX}-prod.yaml`    |
| Development | `clusters/home/values/${PREFIX}-dev.yaml`     |
| Staging     | `clusters/home/values/${PREFIX}-staging.yaml` |

### Update Process

1. Clone the GitOps repository
2. Update `tag: "..."` in the appropriate values file
3. Commit with message format: `chore(${ENV}): update ${SERVICE} to ${TAG}`
4. Push with retry logic (handles concurrent updates from multiple workflows)

## Image Cleanup

**Policy**: Keep the last 10 images per environment prefix.

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

| Stage  | Timeout | Rationale                              |
| ------ | ------- | -------------------------------------- |
| Check  | 60 min  | Accommodate parallel tests and queuing |
| Build  | 60 min  | Docker build plus potential queue wait |
| Deploy | 60 min  | GitOps update with retry logic         |

The 60-minute timeout accommodates KEDA auto-scaling (up to 6 runners) and queue wait times during high activity periods.

## Secrets Management

| Secret           | Description                       | Used By       |
| ---------------- | --------------------------------- | ------------- |
| `GITEA_USERNAME` | Gitea container registry username | Build stage   |
| `GITEA_TOKEN`    | Gitea registry and API token      | Build, Deploy |
| `GITOPS_PAT`     | GitOps repository access token    | Deploy stage  |

## Adding a New Service

1. **Create workflow file**: Create `.github/workflows/ci-{service-name}.yml`
2. **Use appropriate template**:
   - Backend services: `uses: ./.github/workflows/_service-ci.yml`
   - Web applications: `uses: ./.github/workflows/_web-ci.yml`
3. **Configure parameters**: Set service_name, paths, Prisma requirements, etc.
4. **Test locally**: Optionally trigger manually via workflow_dispatch
5. **Environment routing**: Automatic based on branch name (no additional configuration needed)

### Example: New Backend Service

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

**Note**: The `workflow_dispatch.inputs.deploy_env` option is for the GitHub UI only and is not used by the reusable workflow. Environment selection is automatic based on branch name.

## Troubleshooting

### Build Stage Skipped Unexpectedly

- Verify the branch name matches `develop`, `release`, or `main`
- Confirm this is a push event (not a pull request)
- Check if the image already exists in the registry (this is an optimization, not a problem)

### Deploy Stage Failed

- Verify GITOPS_PAT has write access to the GitOps repository
- Check that the GitOps file path matches the expected convention
- Review retry logic logs for merge conflicts

### Cache Miss

- Verify the cache key pattern matches your configuration
- Check that restore-keys are configured correctly
- Ensure pnpm-lock.yaml is committed to the repository

### Timeout Issues

- Review test performance (tests should complete in under 5 minutes)
- Check KEDA scaling and runner availability
- Consider increasing timeout if queue wait times are consistently long

## Performance Metrics

### Target Benchmarks

| Stage    | Target Time                               |
| -------- | ----------------------------------------- |
| Check    | Under 5 minutes (with cache)              |
| Build    | Under 10 minutes (with cache)             |
| Deploy   | Under 2 minutes                           |
| Total CI | Under 20 minutes (develop branch, cached) |

### Actual Performance (with optimizations)

| Scenario                 | Time                                      |
| ------------------------ | ----------------------------------------- |
| PR validation            | 2-3 minutes (check only)                  |
| Full pipeline (push)     | 15-20 minutes (including queue)           |
| Rebuild (no code change) | Under 1 minute (image exists, skip build) |

## References

- **Git Flow**: `.ai/git-flow.md`
- **CI/CD Architecture**: `.ai/ci-cd.md`
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Reusable Workflows**: https://docs.github.com/en/actions/using-workflows/reusing-workflows

## Related Policies

- **Test Coverage Policy**: `docs/test-coverage.md`

---

**Policy Owner**: DevOps Team | **Review Cycle**: Quarterly

**LLM Reference**: `docs/llm/policies/github-actions-workflows.md`
