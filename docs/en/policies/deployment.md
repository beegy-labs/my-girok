# Deployment Policy

> Kubernetes deployment with Helm, ArgoCD, and Sealed Secrets

## Environments

| Environment | Platform       | Trigger         | Sync Mode |
| ----------- | -------------- | --------------- | --------- |
| Local       | Docker Compose | Manual          | -         |
| Development | Kubernetes     | Push to develop | Auto      |
| Staging     | Kubernetes     | Push to release | Manual    |
| Production  | Kubernetes     | Push to main    | Manual    |

## Kubernetes Namespaces

| Namespace     | Purpose                                |
| ------------- | -------------------------------------- |
| gateway       | Cilium Gateway, GraphQL BFF, WebSocket |
| services      | auth, personal, identity, etc.         |
| data          | PostgreSQL, Valkey, ClickHouse         |
| observability | Prometheus, Grafana, Jaeger            |

## Helm Chart Structure

```
services/<service>/helm/
├── Chart.yaml
├── values.yaml.example       # Committed (example values)
├── values.yaml               # Gitignored (local overrides)
├── values-dev.yaml           # Development values
├── values-staging.yaml       # Staging values
├── values-prod.yaml          # Production values
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── sealed-secret.yaml
    └── migration-job.yaml    # ArgoCD PreSync hook
```

## Sealed Secrets

Create and seal secrets for Kubernetes:

```bash
# Create secret YAML (locally, never commit)
kubectl create secret generic auth-secrets \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/db' \
  --from-literal=JWT_SECRET='your-secret-key' \
  --dry-run=client -o yaml > /tmp/secret.yaml

# Seal the secret
kubeseal --format yaml < /tmp/secret.yaml > helm/templates/sealed-secret.yaml

# Clean up plaintext
rm /tmp/secret.yaml
```

## Database Migration Job

ArgoCD PreSync hook for database migrations:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-5"
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command:
            - /bin/sh
            - -c
            - goose -dir /app/services/{{ .Values.service.name }}/migrations postgres "$DATABASE_URL" up
          envFrom:
            - secretRef:
                name: {{ .Values.service.name }}-secrets
```

## Identity Service Multi-DB Migrations

For services with multiple databases, use sync waves:

| Phase | Database    | Sync Wave |
| ----- | ----------- | --------- |
| 1     | identity_db | -5        |
| 2     | auth_db     | -4        |
| 3     | legal_db    | -3        |

## Deployment Commands

### Kustomize

```bash
# Apply overlay
kubectl apply -k k8s/overlays/staging
kubectl apply -k k8s/overlays/production
```

### Helm

```bash
# Install/upgrade with environment values
helm install auth-service . -f values.yaml -f values-prod.yaml -n services
helm upgrade auth-service . -f values.yaml -f values-prod.yaml -n services
```

### Rollout Management

```bash
# Restart deployment
kubectl rollout restart deployment/auth-service -n services

# Check status
kubectl rollout status deployment/auth-service -n services

# Rollback
kubectl rollout undo deployment/auth-service -n services
```

## Deployment Checklist

### Before Deployment

- [ ] Docker images built and pushed to registry
- [ ] goose migrations included in image
- [ ] Sealed Secrets created and committed
- [ ] `migration.enabled: true` in values

### During Deployment

- [ ] Use Manual Sync for database changes
- [ ] Monitor PreSync migration job
- [ ] Check migration logs: `kubectl logs job/<service>-migrate -n services`

### After Deployment

- [ ] Verify `goose_db_version` table updated
- [ ] Check pod logs are clean
- [ ] Test API endpoints
- [ ] Verify health checks passing

## Troubleshooting

| Issue                | Solution                                         |
| -------------------- | ------------------------------------------------ |
| Migration job failed | `kubectl logs job/<service>-migrate -n services` |
| Pod not starting     | `kubectl describe pod <pod-name> -n services`    |
| Secret not found     | Verify sealed-secret is applied                  |
| Image pull failed    | Check imagePullSecrets configuration             |

---

**LLM Reference**: `docs/llm/policies/DEPLOYMENT.md`
