# Helm Deployment Quick Reference

## Files Structure

```
helm/
├── Chart.yaml
├── values.yaml.example     # Git committed (example only)
├── values.yaml            # Gitignored (user creates)
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── sealed-secret.yaml # Template only
│   ├── migration-job.yaml # ArgoCD PreSync hook for goose
│   └── _helpers.tpl
└── README.md
```

## User Workflow

```bash
# 1. Setup
cd services/auth-service/helm
cp values.yaml.example values.yaml
nano values.yaml  # Update domains, replicas, resources

# 2. Create Sealed Secrets
kubectl create secret generic my-girok-auth-service-secret \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="..." \
  --dry-run=client -o yaml | \
kubeseal --format yaml > sealed-secret.yaml

# 3. Deploy
helm install my-girok-auth . -f values.yaml -n my-girok --create-namespace

# 4. Check
helm status my-girok-auth -n my-girok
kubectl get pods -n my-girok
```

## Key Points

- ✅ Example values in git
- ✅ Actual values gitignored
- ✅ Use Sealed Secrets for production
- ✅ Separate values per environment (values-dev.yaml, values-prod.yaml)

## Environment-Specific

Users create multiple values files:

- `values-dev.yaml` - 1 replica, lower resources
- `values-staging.yaml` - 2 replicas, medium resources
- `values-prod.yaml` - 3+ replicas, full resources, anti-affinity

```bash
helm install my-girok-auth . -f values.yaml -f values-prod.yaml
```

## Database Migrations (goose)

### migration-job.yaml

ArgoCD PreSync hook runs `goose up` before deployment:

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

### Enable in values (platform-gitops)

```yaml
migration:
  enabled: true
```

### Key Points

- PreSync runs BEFORE pods deploy
- `BeforeHookCreation` deletes old Job before creating new
- `sync-wave: "-5"` ensures migration runs first
- goose binary + migrations are baked into Docker image

**Full guide**: `.ai/database.md`
