# Helm Deployment

> Helm + ArgoCD + Sealed Secrets + OTEL + Vault (Updated 2026-01-11)

## Overview

The project uses Helm charts for Kubernetes deployments, integrated with ArgoCD for GitOps, Sealed Secrets for secret management, and OpenTelemetry for observability.

## Chart Structure

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

## Deployment Workflow

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

## Database Migration (goose + ArgoCD)

Migrations run as PreSync hooks before the main deployment:

```yaml
annotations:
  argocd.argoproj.io/hook: PreSync
  argocd.argoproj.io/sync-wave: '-5'
```

View migration logs:

```bash
kubectl logs job/<service>-migrate -n dev-my-girok
```

## Environment Values

| Environment | File                | Replicas |
| ----------- | ------------------- | -------- |
| Dev         | values-dev.yaml     | 1        |
| Staging     | values-staging.yaml | 2        |
| Production  | values-prod.yaml    | 3+       |

Each environment has its own values file with appropriate resource allocations.

## OpenTelemetry Configuration (Added 2026-01-11)

```yaml
otel:
  enabled: true
  endpoint: 'http://otel-collector.observability:4318'
  protocol: 'http/protobuf'
  tracesEnabled: true
  metricsEnabled: true
  logsEnabled: true
```

The deployment template injects these environment variables:

- OTEL_EXPORTER_OTLP_ENDPOINT
- OTEL_SERVICE_NAME
- OTEL_RESOURCE_ATTRIBUTES
- OTEL_TRACES/METRICS/LOGS_EXPORTER

## ExternalSecrets (Vault Integration)

```yaml
externalSecrets:
  enabled: true
  refreshInterval: '1h'
```

### Vault Paths (auth-bff example)

```
secret/apps/my-girok/{env}/auth-bff/session
secret/apps/my-girok/{env}/auth-bff/encryption
secret/apps/my-girok/{env}/auth-bff/valkey
secret/apps/my-girok/{env}/auth-bff/oauth/{provider}
```

ExternalSecrets uses `ClusterSecretStore: vault-backend` to sync secrets from Vault to Kubernetes.

## Best Practices

- Never commit `values.yaml` files with actual secrets
- Use Sealed Secrets or ExternalSecrets for sensitive data
- Test migrations in dev environment before staging/production
- Monitor ArgoCD sync status after deployments

---

**LLM Reference**: `docs/llm/helm-deployment.md`
