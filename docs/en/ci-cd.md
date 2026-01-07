# CI/CD Pipeline

> GitHub Actions + Gitea Registry + ArgoCD deployment pipeline

## Stack Overview

| Component | Tool                    |
| --------- | ----------------------- |
| CI        | GitHub Actions          |
| Registry  | Gitea (gitea.girok.dev) |
| CD        | ArgoCD                  |

## Workflow

```
Developer Push -> GitHub Actions -> Gitea Registry -> ArgoCD -> Kubernetes
```

## Image Tagging Strategy

| Branch     | Tag Format         | Example         |
| ---------- | ------------------ | --------------- |
| develop    | `develop-<sha>`    | develop-a1b2c3d |
| release/\* | `release-<sha>`    | release-e4f5g6h |
| main       | `<sha>` + `latest` | a1b2c3d, latest |

## Environment Mapping

| Environment | Branch     | Namespace        | Sync Mode |
| ----------- | ---------- | ---------------- | --------- |
| Development | develop    | my-girok-dev     | Auto      |
| Staging     | release/\* | my-girok-staging | Manual    |
| Production  | main       | my-girok-prod    | Manual    |

## Workflows

### Auth Service CI

**Triggers**: Push to develop, release/**, main (paths: services/auth-service/**)

**Jobs**:

1. Test - Run unit and integration tests
2. Build - Build Docker image
3. Push - Push to registry
4. Cleanup - Remove old images

### Web-Main CI (Parallel Execution)

**Parallel Jobs**:

- lint - ESLint check
- type-check - TypeScript validation
- test - Jest tests

**Sequential Job**:

- build - Production build (after all parallel jobs pass)

**Performance**: ~3-5 min total (2-3x faster than sequential)

## Caching Configuration

```yaml
# pnpm cache
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}

# Docker layer cache
cache-to: type=registry,ref=harbor.girok.dev/my-girok/<service>:buildcache
```

## ArgoCD Image Updater

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myimage=harbor.girok.dev/my-girok/auth-service
  argocd-image-updater.argoproj.io/myimage.update-strategy: digest
  argocd-image-updater.argoproj.io/myimage.allow-tags: regexp:^develop-.*$
```

## Initial Setup

### GitHub Secrets

```bash
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-token>
```

### Kubernetes ImagePullSecret

```bash
kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<token>' \
  --namespace=my-girok-dev
```

## Troubleshooting

| Issue                    | Solution                                          |
| ------------------------ | ------------------------------------------------- |
| Cannot connect to Harbor | Check GitHub Secrets configuration                |
| Permission denied        | Verify robot account has Push Artifact permission |
| Image not updating       | Check ArgoCD Image Updater logs for sync issues   |

---

**LLM Reference**: `docs/llm/CI_CD.md`
