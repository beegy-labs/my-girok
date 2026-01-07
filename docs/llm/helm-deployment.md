# Helm Deployment

Helm + ArgoCD + Sealed Secrets

## Structure

```
services/<service>/helm/
  Chart.yaml
  values.yaml.example  # Git committed
  values.yaml          # Gitignored
  templates/
    deployment.yaml
    service.yaml
    migration-job.yaml # ArgoCD PreSync
    sealed-secret.yaml
```

## Workflow

```bash
# Setup
cp values.yaml.example values.yaml
nano values.yaml

# Create Sealed Secret
kubectl create secret generic <service>-secret \
  --from-literal=database-url="postgresql://..." \
  --dry-run=client -o yaml | kubeseal --format yaml > sealed-secret.yaml

# Deploy
helm install <release> . -f values.yaml -n my-girok
```

## Migration (goose + ArgoCD)

```yaml
annotations:
  argocd.argoproj.io/hook: PreSync
  argocd.argoproj.io/sync-wave: '-5'
```

```bash
kubectl logs job/<service>-migrate -n dev-my-girok
```

## Environment Values

| Environment | File                | Replicas |
| ----------- | ------------------- | -------- |
| Dev         | values-dev.yaml     | 1        |
| Staging     | values-staging.yaml | 2        |
| Production  | values-prod.yaml    | 3+       |
