# Deployment

## Environments

| Env     | Platform       | Trigger      | Sync   |
| ------- | -------------- | ------------ | ------ |
| Local   | Docker Compose | Manual       | -      |
| Dev     | K8s            | Push develop | Auto   |
| Staging | K8s            | Push release | Manual |
| Prod    | K8s            | Push main    | Manual |

## Namespaces

| Namespace     | Purpose                        |
| ------------- | ------------------------------ |
| gateway       | Cilium, GraphQL BFF, WS        |
| services      | auth, personal, etc            |
| data          | PostgreSQL, Valkey, ClickHouse |
| observability | Prometheus, Grafana, Jaeger    |

## Helm Structure

```
services/<service>/helm/
├── Chart.yaml
├── values.yaml.example     # Git (example)
├── values.yaml             # Gitignored
├── values-{dev,staging,prod}.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── sealed-secret.yaml
    └── migration-job.yaml  # ArgoCD PreSync
```

## Sealed Secrets

```bash
kubectl create secret generic auth-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=xxx \
  --dry-run=client -o yaml > /tmp/secret.yaml
kubeseal --format yaml < /tmp/secret.yaml > sealed-secret.yaml
rm /tmp/secret.yaml
```

## Migration Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: '-5'
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          command:
            [
              '/bin/sh',
              '-c',
              'goose -dir /app/services/<service>/migrations postgres "$DATABASE_URL" up',
            ]
```

## Identity Service Migrations

| Phase | Database    | Sync Wave |
| ----- | ----------- | --------- |
| 1     | identity_db | -5        |
| 2     | auth_db     | -4        |
| 3     | legal_db    | -3        |

## Commands

```bash
# Kustomize
kubectl apply -k k8s/overlays/{staging,production}

# Helm
helm install <release> . -f values.yaml -f values-prod.yaml -n my-girok

# Rollout
kubectl rollout restart deployment/<service> -n services
kubectl rollout status deployment/<service> -n services
```

## Checklist

### Before

- [ ] Docker images pushed
- [ ] goose migrations in image
- [ ] Sealed Secrets created
- [ ] migration.enabled: true

### During

- [ ] Manual Sync for DB changes
- [ ] Monitor PreSync Job
- [ ] Check logs: `kubectl logs job/<service>-migrate`

### After

- [ ] goose_db_version updated
- [ ] Pod logs clean
- [ ] API endpoints working
- [ ] Health checks passing

## Troubleshooting

| Issue             | Solution                         |
| ----------------- | -------------------------------- |
| Migration failed  | `kubectl logs job/<svc>-migrate` |
| Pod not starting  | `kubectl describe pod <pod>`     |
| Secret not found  | Verify sealed-secret applied     |
| Image pull failed | Check imagePullSecrets           |
