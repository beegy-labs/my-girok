# Helm Deployment

Helm + ArgoCD + Sealed Secrets + OTEL + Vault (Updated 2026-01-11)

## Structure

```
services/<service>/helm/
  Chart.yaml
  values.yaml.example  # Git committed
  values.yaml          # Gitignored
  templates/
    deployment.yaml
    service.yaml
    migration-job.yaml     # ArgoCD PreSync
    sealed-secret.yaml
    externalsecrets.yaml   # Vault integration (optional)
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

## OpenTelemetry (Added 2026-01-11)

```yaml
otel:
  enabled: true
  endpoint: 'http://otel-collector.observability:4318'
  protocol: 'http/protobuf'
  tracesEnabled: true
  metricsEnabled: true
  logsEnabled: true
```

Deployment env vars:

- OTEL_EXPORTER_OTLP_ENDPOINT
- OTEL_SERVICE_NAME
- OTEL_RESOURCE_ATTRIBUTES
- OTEL_TRACES/METRICS/LOGS_EXPORTER

## ExternalSecrets (Vault)

```yaml
externalSecrets:
  enabled: true
  refreshInterval: '1h'
```

Vault paths (auth-bff):

```
secret/apps/my-girok/{env}/auth-bff/session
secret/apps/my-girok/{env}/auth-bff/encryption
secret/apps/my-girok/{env}/auth-bff/valkey
secret/apps/my-girok/{env}/auth-bff/oauth/{provider}
```

Uses `ClusterSecretStore: vault-backend`.
