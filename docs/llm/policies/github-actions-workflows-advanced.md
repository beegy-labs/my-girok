# GitHub Actions Workflows - Advanced

> Optimizations, image tagging, GitOps, cleanup, and troubleshooting

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

---

_Main: `github-actions-workflows.md`_
