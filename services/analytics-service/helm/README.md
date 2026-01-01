# My-Girok Analytics Service Helm Chart

Kubernetes Helm Chart for My-Girok Analytics and Business Intelligence microservice (ClickHouse-based).

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- External Secrets Operator (ESO) installed for secret management
- ClickHouse cluster available

## Quick Start

### 1. Install External Secrets Operator (if not already installed)

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### 2. Configure Vault Secrets

Ensure the following secrets exist in Vault:

```bash
# Path: secret/apps/my-girok/{env}/analytics-service/clickhouse
vault kv put secret/apps/my-girok/dev/analytics-service/clickhouse \
  host="clickhouse.example.com" \
  port="8123" \
  database="analytics_db" \
  username="analytics_user" \
  password="your-secure-password"

# Path: secret/apps/my-girok/{env}/analytics-service/valkey
vault kv put secret/apps/my-girok/dev/analytics-service/valkey \
  host="valkey.example.com" \
  port="6379" \
  password="your-valkey-password"
```

### 3. Install the Chart

```bash
# Development
helm install analytics-service ./helm \
  -f helm/values-development.yaml \
  --namespace dev-my-girok \
  --create-namespace

# Release (Staging)
helm install analytics-service ./helm \
  -f helm/values-release.yaml \
  --namespace release-my-girok \
  --create-namespace

# Production
helm install analytics-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok \
  --create-namespace
```

## Configuration

### Environment-Specific Values

The chart supports three environments with separate value files:

- `values-development.yaml` - Development environment
- `values-release.yaml` - Staging/QA environment
- `values-production.yaml` - Production environment

### Key Configuration Options

| Parameter                 | Description        | Default                                         |
| ------------------------- | ------------------ | ----------------------------------------------- |
| `replicaCount`            | Number of replicas | `2`                                             |
| `image.repository`        | Image repository   | `ghcr.io/beegy-labs/my-girok/analytics-service` |
| `image.tag`               | Image tag          | Chart appVersion                                |
| `service.port`            | Service port       | `3004`                                          |
| `ingress.enabled`         | Enable ingress     | `true`                                          |
| `autoscaling.enabled`     | Enable HPA         | `true`                                          |
| `autoscaling.minReplicas` | Min replicas       | `2`                                             |
| `autoscaling.maxReplicas` | Max replicas       | `10`                                            |
| `resources.limits.cpu`    | CPU limit          | `1000m`                                         |
| `resources.limits.memory` | Memory limit       | `512Mi`                                         |

### ClickHouse Configuration

Analytics Service uses ClickHouse for high-performance analytics:

```yaml
clickhouse:
  host: clickhouse.example.com
  port: 8123
  database: analytics_db
```

### Dependencies

Analytics Service depends on:

- ClickHouse (analytics_db)
- Valkey/Redis (for caching and rate limiting)
- Auth Service (for JWT validation)

## API Endpoints

| Endpoint                | Method | Description           |
| ----------------------- | ------ | --------------------- |
| `/health`               | GET    | Health check          |
| `/v1/events`            | POST   | Track events          |
| `/v1/events/batch`      | POST   | Batch track events    |
| `/v1/identify`          | POST   | Identify user         |
| `/v1/page`              | POST   | Track page view       |
| `/v1/analytics/summary` | GET    | Get analytics summary |

## Upgrade

```bash
# Upgrade with new values
helm upgrade analytics-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok

# Upgrade with new image version
helm upgrade analytics-service ./helm \
  --set image.tag=v0.2.0 \
  --namespace my-girok
```

## Rollback

```bash
# List releases
helm history analytics-service -n my-girok

# Rollback to previous version
helm rollback analytics-service -n my-girok

# Rollback to specific revision
helm rollback analytics-service 1 -n my-girok
```

## Uninstall

```bash
helm uninstall analytics-service --namespace my-girok
```

## Security Best Practices

### 1. Secrets Management

- **NEVER** commit plain secrets to Git
- Always use External Secrets Operator with Vault
- Rotate ClickHouse credentials regularly

### 2. Rate Limiting

Analytics endpoints should have rate limiting:

```yaml
nginx.ingress.kubernetes.io/limit-rps: '100'
nginx.ingress.kubernetes.io/limit-connections: '10'
```

### 3. Data Privacy

- Event properties are validated with 100KB size limit
- IP addresses are anonymized for GDPR compliance
- PII is never stored in analytics events

## Monitoring

### Health Checks

The service exposes health endpoints:

- Liveness: `GET /health`
- Readiness: `GET /health`

### Prometheus Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: analytics-service
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: analytics-service
  endpoints:
    - port: http
      path: /metrics
```

### Key Metrics

- `analytics_events_total` - Total events tracked
- `analytics_events_batch_size` - Batch event sizes
- `analytics_clickhouse_query_duration` - ClickHouse query latency

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok -l app.kubernetes.io/name=analytics-service
```

### View Logs

```bash
kubectl logs -f deployment/analytics-service -n my-girok
```

### Check ClickHouse Connectivity

```bash
# Test ClickHouse connectivity from pod
kubectl exec -it <pod-name> -n my-girok -- sh
# Then inside pod:
# curl -s "http://clickhouse:8123/ping"
```

### Common Issues

#### 1. ClickHouse Connection Timeout

```bash
# Check ClickHouse is accessible
kubectl run clickhouse-test --rm -it --image=curlimages/curl -- \
  curl -s "http://clickhouse:8123/ping"
```

#### 2. High Memory Usage

Analytics Service can consume memory when processing large batches. Adjust:

```yaml
resources:
  limits:
    memory: 1Gi
  requests:
    memory: 512Mi
```

## GitOps Integration

This service is deployed via ArgoCD. Configuration is managed in:

- `platform-gitops/apps/my-girok/analytics-service/`
- `platform-gitops/clusters/home/values/my-girok-analytics-service-{env}.yaml`

## Support

For issues and questions:

- GitHub Issues: https://github.com/beegy-labs/my-girok/issues
