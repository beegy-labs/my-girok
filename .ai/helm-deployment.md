# Helm Deployment

> Helm + ArgoCD + Sealed Secrets + OTEL + Vault | **Last Updated**: 2026-01-11

## Structure

```
services/<service>/helm/
├── Chart.yaml, values.yaml.example
├── templates/ (deployment, service, migration-job, sealed-secret, externalsecrets)
```

## Workflow

```bash
cp values.yaml.example values.yaml
helm install <release> . -f values.yaml -n my-girok
```

## OTEL Configuration

```yaml
otel:
  enabled: true
  endpoint: 'http://otel-collector.observability:4318'
  tracesEnabled: true
  metricsEnabled: true
```

## ExternalSecrets (Vault)

```yaml
externalSecrets:
  enabled: true
  refreshInterval: '1h'
```

Vault paths: `secret/apps/my-girok/{env}/{service}/*`

## Migration

ArgoCD PreSync Job runs `goose up`:

```yaml
argocd.argoproj.io/hook: PreSync
argocd.argoproj.io/sync-wave: '-5'
```

**SSOT**: `docs/llm/helm-deployment.md`
