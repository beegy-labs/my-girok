# CI/CD Pipeline

GitHub Actions + Gitea Registry + ArgoCD

## Stack

| Component | Tool                    |
| --------- | ----------------------- |
| CI        | GitHub Actions          |
| Registry  | Gitea (gitea.girok.dev) |
| CD        | ArgoCD                  |

## Workflow

```
Developer Push -> GitHub Actions -> Gitea Registry -> ArgoCD -> Kubernetes
```

## Image Tagging

| Branch     | Tag Format         | Example         |
| ---------- | ------------------ | --------------- |
| develop    | `develop-<sha>`    | develop-a1b2c3d |
| release/\* | `release-<sha>`    | release-e4f5g6h |
| main       | `<sha>` + `latest` | a1b2c3d, latest |

## Environment Mapping

| Environment | Branch     | Namespace        | Sync   |
| ----------- | ---------- | ---------------- | ------ |
| Development | develop    | my-girok-dev     | Auto   |
| Staging     | release/\* | my-girok-staging | Manual |
| Production  | main       | my-girok-prod    | Manual |

## Workflows

### Auth Service CI

Triggers: Push to develop, release/**, main (services/auth-service/**)
Jobs: Test -> Build -> Push -> Cleanup

### Web-Main CI (Parallel)

Jobs: lint, type-check, test (parallel) -> build (after all pass)
Performance: ~3-5 min (2-3x faster)

## Caching

```yaml
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
cache-to: type=registry,ref=harbor.girok.dev/my-girok/<service>:buildcache
```

## ArgoCD Image Updater

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myimage=harbor.girok.dev/my-girok/auth-service
  argocd-image-updater.argoproj.io/myimage.update-strategy: digest
  argocd-image-updater.argoproj.io/myimage.allow-tags: regexp:^develop-.*$
```

## Setup

```bash
# GitHub Secrets
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-token>

# K8s ImagePullSecret
kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<token>' \
  --namespace=my-girok-dev
```

## Troubleshooting

| Issue                    | Solution                                     |
| ------------------------ | -------------------------------------------- |
| Cannot connect to Harbor | Check GitHub Secrets                         |
| Permission denied        | Check robot account Push Artifact permission |
| Image not updating       | Check ArgoCD Image Updater logs              |
