# Helm Deployment Quick Reference

> Helm + ArgoCD + Sealed Secrets | **Last Updated**: 2026-01-06

## Files Structure

```
services/<service>/helm/
├── Chart.yaml
├── values.yaml.example     # Git committed
├── values.yaml             # Gitignored
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── migration-job.yaml  # ArgoCD PreSync
│   └── sealed-secret.yaml
└── README.md
```

## Workflow

```bash
# 1. Setup
cp values.yaml.example values.yaml
nano values.yaml

# 2. Create Sealed Secret
kubectl create secret generic <service>-secret \
  --from-literal=database-url="postgresql://..." \
  --dry-run=client -o yaml | kubeseal --format yaml > sealed-secret.yaml

# 3. Deploy
helm install <release> . -f values.yaml -n my-girok
```

## Migration (goose + ArgoCD)

ArgoCD PreSync Job runs `goose up` before deployment:

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

```bash
helm install <release> . -f values.yaml -f values-prod.yaml
```

---

**Full guide**: `docs/policies/DEPLOYMENT.md`
