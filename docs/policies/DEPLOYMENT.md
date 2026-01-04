# Deployment Guide

> Kubernetes deployment with Helm, ArgoCD, and Cilium Gateway API

## Environments

| Environment | Platform       | Trigger         | Sync   |
| ----------- | -------------- | --------------- | ------ |
| Local       | Docker Compose | Manual          | -      |
| Development | Kubernetes     | Push to develop | Auto   |
| Staging     | Kubernetes     | Push to release | Manual |
| Production  | Kubernetes     | Push to main    | Manual |

## Namespace Strategy

| Namespace     | Purpose                                 |
| ------------- | --------------------------------------- |
| gateway       | Cilium Gateway, GraphQL BFF, WS Gateway |
| services      | Domain services (auth, personal, etc.)  |
| data          | PostgreSQL, Valkey, ClickHouse          |
| observability | Prometheus, Grafana, Jaeger             |

## Helm Structure

```
services/<service>/helm/
├── Chart.yaml
├── values.yaml.example     # Git committed (example)
├── values.yaml             # Gitignored (user creates)
├── values-dev.yaml         # Dev overrides
├── values-staging.yaml     # Staging overrides
├── values-prod.yaml        # Production overrides
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── sealed-secret.yaml
│   └── migration-job.yaml  # ArgoCD PreSync hook
└── README.md
```

## Secrets Management

### Sealed Secrets (Recommended)

```bash
# Create and seal secret
kubectl create secret generic auth-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=xxx \
  --dry-run=client -o yaml > /tmp/secret.yaml

kubeseal --format yaml < /tmp/secret.yaml > sealed-secret.yaml
rm /tmp/secret.yaml  # Delete original!
```

### Identity Service (Multi-Database)

```bash
kubectl create secret generic identity-service-secret \
  --from-literal=identity-database-url="postgresql://..." \
  --from-literal=auth-database-url="postgresql://..." \
  --from-literal=legal-database-url="postgresql://..." \
  --from-literal=identity-read-database-url="postgresql://..." \
  --from-literal=auth-read-database-url="postgresql://..." \
  --from-literal=legal-read-database-url="postgresql://..." \
  --from-literal=jwt-private-key="..." \
  --from-literal=jwt-public-key="..." \
  --dry-run=client -o yaml | kubeseal --format yaml > sealed-secret.yaml
```

**Rules:**

- Use Sealed Secrets or External Secrets Operator
- Different secrets per environment
- Never commit plain Secrets to Git

## Database Migration (goose + ArgoCD)

### Flow

```
migrations/*.sql → Docker Image → ArgoCD PreSync Job → App Deploy
```

### migration-job.yaml

```yaml
{{- if .Values.migration.enabled }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "<service>.fullname" . }}-migrate
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
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command:
            - /bin/sh
            - -c
            - |
              goose -dir /app/services/<service>/migrations postgres "$DATABASE_URL" up
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "<service>.fullname" . }}-secret
                  key: database-url
{{- end }}
```

### Identity Service (3 Migrations)

| Phase | Database    | Sync Wave |
| ----- | ----------- | --------- |
| 1     | identity_db | -5        |
| 2     | auth_db     | -4        |
| 3     | legal_db    | -3        |

## Deployment Commands

```bash
# Kustomize
kubectl apply -k k8s/overlays/staging
kubectl apply -k k8s/overlays/production

# Helm
helm install <release> . -f values.yaml -f values-prod.yaml -n my-girok

# Rollout
kubectl rollout restart deployment/<service> -n services
kubectl rollout status deployment/<service> -n services
```

## Deployment Checklist

### Before Deploy

- [ ] Docker images pushed to registry
- [ ] goose migrations included in image
- [ ] Sealed Secrets created for environment
- [ ] `migration.enabled: true` in Helm values

### During Deploy

- [ ] Manual Sync for DB schema changes
- [ ] Monitor PreSync Job in ArgoCD UI
- [ ] Check migration logs: `kubectl logs job/<service>-migrate`

### After Deploy

- [ ] Verify `goose_db_version` table updated
- [ ] Check pod logs for errors
- [ ] Test API endpoints
- [ ] Verify health checks passing

## Troubleshooting

| Issue             | Solution                                     |
| ----------------- | -------------------------------------------- |
| Migration failed  | Check logs: `kubectl logs job/<svc>-migrate` |
| Pod not starting  | Check events: `kubectl describe pod <pod>`   |
| Secret not found  | Verify sealed-secret applied                 |
| Image pull failed | Check imagePullSecrets configured            |

---

**Quick reference**: `.ai/helm-deployment.md`
