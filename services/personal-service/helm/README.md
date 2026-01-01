# My-Girok Personal Service Helm Chart

Kubernetes Helm Chart for My-Girok Personal Data Management microservice (Resume, Profile, Share).

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- External Secrets Operator (ESO) installed for secret management

## Quick Start

### 1. Install External Secrets Operator (if not already installed)

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### 2. Configure Vault Secrets

Ensure the following secrets exist in Vault:

```bash
# Path: secret/apps/my-girok/{env}/personal-service/postgres
vault kv put secret/apps/my-girok/dev/personal-service/postgres \
  username="personal_dev" \
  password="your-secure-password" \
  host="db-postgres-001.example.com" \
  port="5432" \
  database="personal_dev"

# Path: secret/apps/my-girok/{env}/personal-service/valkey
vault kv put secret/apps/my-girok/dev/personal-service/valkey \
  host="valkey.example.com" \
  port="6379" \
  password="your-valkey-password"

# Path: secret/apps/my-girok/{env}/personal-service/minio
vault kv put secret/apps/my-girok/dev/personal-service/minio \
  endpoint="minio.example.com" \
  access_key="your-access-key" \
  secret_key="your-secret-key" \
  bucket="personal-files"
```

### 3. Install the Chart

```bash
# Development
helm install personal-service ./helm \
  -f helm/values-development.yaml \
  --namespace dev-my-girok \
  --create-namespace

# Release (Staging)
helm install personal-service ./helm \
  -f helm/values-release.yaml \
  --namespace release-my-girok \
  --create-namespace

# Production
helm install personal-service ./helm \
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

| Parameter                 | Description            | Default                                        |
| ------------------------- | ---------------------- | ---------------------------------------------- |
| `replicaCount`            | Number of replicas     | `2`                                            |
| `image.repository`        | Image repository       | `ghcr.io/beegy-labs/my-girok/personal-service` |
| `image.tag`               | Image tag              | Chart appVersion                               |
| `service.port`            | Service port           | `3002`                                         |
| `ingress.enabled`         | Enable ingress         | `true`                                         |
| `autoscaling.enabled`     | Enable HPA             | `true`                                         |
| `autoscaling.minReplicas` | Min replicas           | `2`                                            |
| `autoscaling.maxReplicas` | Max replicas           | `10`                                           |
| `resources.limits.cpu`    | CPU limit              | `1000m`                                        |
| `resources.limits.memory` | Memory limit           | `512Mi`                                        |
| `migration.enabled`       | Enable goose migration | `true`                                         |

### Database Migration (goose)

Database migrations run automatically via ArgoCD PreSync hook:

```yaml
migration:
  enabled: true # Enable ArgoCD PreSync migration hook
```

### Dependencies

Personal Service depends on:

- PostgreSQL (personal_db)
- Valkey/Redis (for BullMQ job queues)
- MinIO (for file storage)
- Auth Service (for JWT validation)

## Upgrade

```bash
# Upgrade with new values
helm upgrade personal-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok

# Upgrade with new image version
helm upgrade personal-service ./helm \
  --set image.tag=v0.2.0 \
  --namespace my-girok
```

## Rollback

```bash
# List releases
helm history personal-service -n my-girok

# Rollback to previous version
helm rollback personal-service -n my-girok

# Rollback to specific revision
helm rollback personal-service 1 -n my-girok
```

## Uninstall

```bash
helm uninstall personal-service --namespace my-girok
```

## Security Best Practices

### 1. Secrets Management

- **NEVER** commit plain secrets to Git
- Always use External Secrets Operator with Vault
- Rotate secrets regularly

### 2. Network Policies

```yaml
# Example NetworkPolicy (apply separately)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: personal-service-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: personal-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3002
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 5432 # PostgreSQL
        - protocol: TCP
          port: 6379 # Valkey
        - protocol: TCP
          port: 9000 # MinIO
```

### 3. Pod Security

The chart includes:

- Non-root user (UID 1000)
- Read-only root filesystem
- Dropped capabilities
- No privilege escalation

## Monitoring

### Health Checks

The service exposes health endpoints:

- Liveness: `GET /health`
- Readiness: `GET /health`

### Prometheus Metrics (if enabled)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: personal-service
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: personal-service
  endpoints:
    - port: http
      path: /metrics
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok -l app.kubernetes.io/name=personal-service
```

### View Logs

```bash
kubectl logs -f deployment/personal-service -n my-girok
```

### Check External Secrets

```bash
# Verify external secret exists
kubectl get externalsecret -n my-girok

# Check if secret was synced
kubectl get secret personal-service-secret -n my-girok
```

### Common Issues

#### 1. Migration Failed

```bash
# Check migration job logs
kubectl logs job/personal-service-migration -n my-girok

# Check if DATABASE_URL is correctly set
kubectl describe job personal-service-migration -n my-girok
```

#### 2. MinIO Connection Issues

```bash
# Test MinIO connectivity from pod
kubectl exec -it <pod-name> -n my-girok -- sh
# Then inside pod:
# nc -zv minio.example.com 9000
```

#### 3. BullMQ Queue Issues

```bash
# Check Valkey connectivity
kubectl exec -it <pod-name> -n my-girok -- sh
# Then inside pod:
# nc -zv valkey.example.com 6379
```

## GitOps Integration

This service is deployed via ArgoCD. Configuration is managed in:

- `platform-gitops/apps/my-girok/personal-service/`
- `platform-gitops/clusters/home/values/my-girok-personal-service-{env}.yaml`

## Support

For issues and questions:

- GitHub Issues: https://github.com/beegy-labs/my-girok/issues
