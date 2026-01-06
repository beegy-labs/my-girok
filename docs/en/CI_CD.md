# CI/CD Pipeline

> GitHub Actions + Gitea Registry + ArgoCD

## Stack

| Component | Tool                    |
| --------- | ----------------------- |
| CI        | GitHub Actions          |
| Registry  | Gitea (gitea.girok.dev) |
| CD        | ArgoCD                  |

## Workflow

```
Developer Push → GitHub Actions → Gitea Registry → ArgoCD → Kubernetes
```

## Image Tagging

| Branch     | Tag Format                  | Example             |
| ---------- | --------------------------- | ------------------- |
| develop    | `develop-<sha>` + `develop` | `develop-a1b2c3d`   |
| release/\* | `release-<sha>` + `release` | `release-e4f5g6h`   |
| main       | `<sha>` + `latest`          | `a1b2c3d`, `latest` |

## Image Retention

| Environment | Max Images | Special Tags |
| ----------- | ---------- | ------------ |
| Development | 10         | `develop`    |
| Staging     | 10         | `release`    |
| Production  | 10         | `latest`     |

## Workflows

### Auth Service CI

**Triggers**: Push to `develop`, `release/**`, `main` (files: `services/auth-service/**`)

**Jobs**: Test → Build → Push → Cleanup

### Web-Main CI (Parallel)

**Jobs** (run in parallel):

- lint: ESLint
- type-check: TypeScript
- test: Vitest
- build: After all pass → Docker push

**Performance**: ~3-5 min (2-3x faster than sequential)

## Caching

```yaml
# Node modules cache (Web-Main)
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
paths:
  - node_modules
  - apps/web-main/node_modules

# Docker build cache
cache-to: type=registry,ref=harbor.girok.dev/my-girok/<service>:buildcache,mode=max
```

## ArgoCD

### Environment Mapping

| Environment | Branch     | Namespace        | Sync   |
| ----------- | ---------- | ---------------- | ------ |
| Development | develop    | my-girok-dev     | Auto   |
| Staging     | release/\* | my-girok-staging | Manual |
| Production  | main       | my-girok-prod    | Manual |

### Image Updater

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myimage=harbor.girok.dev/my-girok/auth-service
  argocd-image-updater.argoproj.io/myimage.update-strategy: digest
  argocd-image-updater.argoproj.io/myimage.allow-tags: regexp:^develop-.*$
```

## Setup

### GitHub Secrets

```
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-token>
```

### K8s ImagePullSecret

```bash
kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<token>' \
  --namespace=my-girok-dev
```

## Troubleshooting

| Issue                    | Solution                                                     |
| ------------------------ | ------------------------------------------------------------ |
| Cannot connect to Harbor | Check GitHub Secrets, verify `curl https://harbor.girok.dev` |
| Permission denied        | Check robot account has Push Artifact permission             |
| Image not updating       | Check ArgoCD Image Updater logs, verify tag pattern          |

```bash
# Check Image Updater logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater
```

---

**Quick reference**: `.ai/ci-cd.md`
