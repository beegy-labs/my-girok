# My-Girok Audit Service Helm Chart

Kubernetes Helm Chart for My-Girok Audit and Compliance microservice (ClickHouse-based).

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
# Path: secret/apps/my-girok/{env}/audit-service/clickhouse
vault kv put secret/apps/my-girok/dev/audit-service/clickhouse \
  host="clickhouse.example.com" \
  port="8123" \
  database="audit_db" \
  username="audit_user" \
  password="your-secure-password"

# Path: secret/apps/my-girok/{env}/audit-service/valkey
vault kv put secret/apps/my-girok/dev/audit-service/valkey \
  host="valkey.example.com" \
  port="6379" \
  password="your-valkey-password"

# Path: secret/apps/my-girok/{env}/audit-service/minio (for exports)
vault kv put secret/apps/my-girok/dev/audit-service/minio \
  endpoint="minio.example.com" \
  access_key="your-access-key" \
  secret_key="your-secret-key" \
  bucket="audit-exports"
```

### 3. Install the Chart

```bash
# Development
helm install audit-service ./helm \
  -f helm/values-development.yaml \
  --namespace dev-my-girok \
  --create-namespace

# Release (Staging)
helm install audit-service ./helm \
  -f helm/values-release.yaml \
  --namespace release-my-girok \
  --create-namespace

# Production
helm install audit-service ./helm \
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

| Parameter                 | Description        | Default                                     |
| ------------------------- | ------------------ | ------------------------------------------- |
| `replicaCount`            | Number of replicas | `2`                                         |
| `image.repository`        | Image repository   | `ghcr.io/beegy-labs/my-girok/audit-service` |
| `image.tag`               | Image tag          | Chart appVersion                            |
| `service.port`            | Service port       | `3003`                                      |
| `ingress.enabled`         | Enable ingress     | `true`                                      |
| `autoscaling.enabled`     | Enable HPA         | `true`                                      |
| `autoscaling.minReplicas` | Min replicas       | `2`                                         |
| `autoscaling.maxReplicas` | Max replicas       | `10`                                        |
| `resources.limits.cpu`    | CPU limit          | `1000m`                                     |
| `resources.limits.memory` | Memory limit       | `512Mi`                                     |

### ClickHouse Configuration

Audit Service uses ClickHouse for high-performance compliance logging:

```yaml
clickhouse:
  host: clickhouse.example.com
  port: 8123
  database: audit_db
```

### Dependencies

Audit Service depends on:

- ClickHouse (audit_db)
- Valkey/Redis (for caching)
- MinIO (for audit log exports)
- Auth Service (for JWT validation)

## API Endpoints

| Endpoint             | Method | Description          |
| -------------------- | ------ | -------------------- |
| `/health`            | GET    | Health check         |
| `/v1/audit/logs`     | POST   | Create audit log     |
| `/v1/audit/logs`     | GET    | Query audit logs     |
| `/v1/audit/logs/:id` | GET    | Get audit log by ID  |
| `/v1/audit/export`   | POST   | Export audit logs    |
| `/v1/audit/stats`    | GET    | Get audit statistics |

## Compliance Features

### GDPR Compliance

- Immutable audit logs (append-only)
- Data retention policies (configurable)
- Export functionality for data requests

### SOC 2 Compliance

- Tamper-evident logging
- Cryptographic integrity verification
- Access control audit trails

### Retention Configuration

```yaml
retention:
  enabled: true
  days: 365 # Keep logs for 1 year
  archiveEnabled: true
  archiveBucket: audit-archive
```

## Upgrade

```bash
# Upgrade with new values
helm upgrade audit-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok

# Upgrade with new image version
helm upgrade audit-service ./helm \
  --set image.tag=v0.2.0 \
  --namespace my-girok
```

## Rollback

```bash
# List releases
helm history audit-service -n my-girok

# Rollback to previous version
helm rollback audit-service -n my-girok

# Rollback to specific revision
helm rollback audit-service 1 -n my-girok
```

## Uninstall

```bash
helm uninstall audit-service --namespace my-girok
```

## Security Best Practices

### 1. Secrets Management

- **NEVER** commit plain secrets to Git
- Always use External Secrets Operator with Vault
- Rotate ClickHouse credentials regularly

### 2. Data Integrity

- Audit logs are immutable (no updates/deletes)
- Cryptographic hashing for tamper detection
- Regular integrity checks

### 3. Access Control

- Admin-only access to audit logs
- Rate limiting on export endpoints
- IP allowlisting for sensitive operations

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
  name: audit-service
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: audit-service
  endpoints:
    - port: http
      path: /metrics
```

### Key Metrics

- `audit_logs_total` - Total audit logs created
- `audit_logs_by_action` - Logs grouped by action type
- `audit_export_duration` - Export job duration
- `audit_clickhouse_query_duration` - ClickHouse query latency

### Alerts

```yaml
# Example PrometheusRule
- alert: AuditServiceDown
  expr: up{job="audit-service"} == 0
  for: 5m
  labels:
    severity: critical

- alert: AuditLogIngestionSlow
  expr: rate(audit_logs_total[5m]) < 1
  for: 15m
  labels:
    severity: warning
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok -l app.kubernetes.io/name=audit-service
```

### View Logs

```bash
kubectl logs -f deployment/audit-service -n my-girok
```

### Check ClickHouse Connectivity

```bash
# Test ClickHouse connectivity from pod
kubectl exec -it <pod-name> -n my-girok -- sh
# Then inside pod:
# curl -s "http://clickhouse:8123/ping"
```

### Common Issues

#### 1. Export Job Failed

```bash
# Check export job status
kubectl logs -f <pod-name> -n my-girok | grep -i export

# Check MinIO connectivity
kubectl exec -it <pod-name> -n my-girok -- sh
# Then inside pod:
# nc -zv minio.example.com 9000
```

#### 2. ClickHouse Write Timeout

Large batch inserts may timeout. Adjust:

```yaml
clickhouse:
  insertTimeout: 60000 # 60 seconds
  maxInsertBatchSize: 10000
```

#### 3. High Disk Usage

ClickHouse can consume significant disk. Monitor:

```bash
# Check ClickHouse disk usage
kubectl exec -it clickhouse-0 -- clickhouse-client -q "SELECT * FROM system.disks"
```

## GitOps Integration

This service is deployed via ArgoCD. Configuration is managed in:

- `platform-gitops/apps/my-girok/audit-service/`
- `platform-gitops/clusters/home/values/my-girok-audit-service-{env}.yaml`

## Support

For issues and questions:

- GitHub Issues: https://github.com/beegy-labs/my-girok/issues
