# My-Girok Auth Service Helm Chart

Kubernetes Helm Chart for My-Girok Authentication and Authorization microservice.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- Sealed Secrets Controller installed (for secret management)

## Quick Start

### 1. Install Sealed Secrets Controller (if not already installed)

```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
```

### 2. Create and Seal Secrets

```bash
# Create plain secret (DO NOT commit this file)
kubectl create secret generic auth-service-secret \
  --from-literal=database-url="postgresql://user:pass@host:5432/db?schema=public" \
  --from-literal=jwt-secret="your-secure-jwt-secret-min-32-chars" \
  --from-literal=jwt-refresh-secret="your-secure-refresh-secret-min-32-chars" \
  --from-literal=google-client-id="" \
  --from-literal=google-client-secret="" \
  --from-literal=kakao-client-id="" \
  --from-literal=kakao-client-secret="" \
  --from-literal=naver-client-id="" \
  --from-literal=naver-client-secret="" \
  --namespace default \
  --dry-run=client -o yaml > secret.yaml

# Seal the secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Apply sealed secret
kubectl apply -f sealed-secret.yaml

# Delete plain secret file (IMPORTANT!)
rm secret.yaml
```

### 3. Install the Chart

```bash
# Development
helm install auth-service ./helm \
  -f helm/values-development.yaml \
  --namespace my-girok-dev \
  --create-namespace

# Staging
helm install auth-service ./helm \
  -f helm/values-staging.yaml \
  --namespace my-girok-staging \
  --create-namespace

# Production
helm install auth-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok-prod \
  --create-namespace
```

## Configuration

### Environment-Specific Values

The chart supports three environments with separate value files:

- `values-development.yaml` - Development environment
- `values-staging.yaml` - Staging/QA environment
- `values-production.yaml` - Production environment

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `your-registry.io/my-girok/auth-service` |
| `image.tag` | Image tag | Chart appVersion |
| `service.port` | Service port | `3001` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts` | Ingress hosts | `auth-api.example.com` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Min replicas | `2` |
| `autoscaling.maxReplicas` | Max replicas | `10` |
| `resources.limits.cpu` | CPU limit | `1000m` |
| `resources.limits.memory` | Memory limit | `512Mi` |

### Database Configuration

Database credentials are managed via Sealed Secrets:

```yaml
app:
  database:
    host: db-postgres-001.beegy.net
    port: 5432
    name: girok_user
    username: girok_user
    # password in sealed secret as database-url
```

## Deployment via URL

### Using Git Repository URL

```bash
# Install directly from Git repository
helm install auth-service \
  https://github.com/beegy/my-girok/releases/download/v0.1.0/auth-service-0.1.0.tgz \
  -f https://raw.githubusercontent.com/beegy/my-girok/main/services/auth-service/helm/values-production.yaml \
  --namespace my-girok-prod
```

### Using Helm Repository

```bash
# Add Helm repository
helm repo add my-girok https://charts.example.com
helm repo update

# Install from repository
helm install auth-service my-girok/auth-service \
  --version 0.1.0 \
  -f values-production.yaml \
  --namespace my-girok-prod
```

## Upgrade

```bash
# Upgrade with new values
helm upgrade auth-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok-prod

# Upgrade with new image version
helm upgrade auth-service ./helm \
  --set image.tag=v0.2.0 \
  --namespace my-girok-prod
```

## Rollback

```bash
# List releases
helm history auth-service -n my-girok-prod

# Rollback to previous version
helm rollback auth-service -n my-girok-prod

# Rollback to specific revision
helm rollback auth-service 1 -n my-girok-prod
```

## Uninstall

```bash
helm uninstall auth-service --namespace my-girok-prod
```

## Security Best Practices

### 1. Secrets Management

- **NEVER** commit plain secrets to Git
- Always use Sealed Secrets or External Secrets Operator
- Rotate secrets regularly (JWT secrets every 90 days)

### 2. Network Policies

```yaml
# Example NetworkPolicy (apply separately)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-service-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: auth-service
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
      port: 3001
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 443   # HTTPS
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

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/health`

### Prometheus Metrics (if enabled)

```yaml
# Add to ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: auth-service
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: auth-service
  endpoints:
  - port: http
    path: /metrics
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok-prod -l app.kubernetes.io/name=auth-service
```

### View Logs

```bash
kubectl logs -f deployment/auth-service -n my-girok-prod
```

### Check Sealed Secret

```bash
# Verify sealed secret exists
kubectl get sealedsecret -n my-girok-prod

# Check if secret was created
kubectl get secret auth-service-secret -n my-girok-prod
```

### Debug Pod

```bash
kubectl run debug --rm -it --image=busybox --namespace=my-girok-prod -- sh
```

### Common Issues

#### 1. ImagePullBackOff

```bash
# Check image pull secrets
kubectl get secrets -n my-girok-prod

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=your-registry.io \
  --docker-username=your-username \
  --docker-password=your-password \
  --namespace=my-girok-prod
```

#### 2. CrashLoopBackOff

```bash
# Check logs for errors
kubectl logs deployment/auth-service -n my-girok-prod

# Check if secrets are properly mounted
kubectl describe pod <pod-name> -n my-girok-prod
```

#### 3. Database Connection Issues

```bash
# Test database connectivity from pod
kubectl exec -it <pod-name> -n my-girok-prod -- sh
# Then inside pod:
# nc -zv db-postgres-001.beegy.net 5432
```

## Git Flow Integration

### Development Branch → Development Environment

```bash
git checkout develop
git pull origin develop

helm upgrade --install auth-service ./helm \
  -f helm/values-development.yaml \
  --namespace my-girok-dev \
  --set image.tag=dev-$(git rev-parse --short HEAD)
```

### Release Branch → Staging Environment

```bash
git checkout release/v0.2.0
git pull origin release/v0.2.0

helm upgrade --install auth-service ./helm \
  -f helm/values-staging.yaml \
  --namespace my-girok-staging \
  --set image.tag=staging-$(git rev-parse --short HEAD)
```

### Main Branch → Production Environment

```bash
git checkout main
git pull origin main

helm upgrade --install auth-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok-prod \
  --set image.tag=v0.2.0
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kubectl
        uses: azure/setup-kubectl@v3

      - name: Install helm
        uses: azure/setup-helm@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > ~/.kube/config

      - name: Deploy to Kubernetes
        run: |
          helm upgrade --install auth-service ./services/auth-service/helm \
            -f services/auth-service/helm/values-production.yaml \
            --namespace my-girok-prod \
            --set image.tag=${GITHUB_REF#refs/tags/} \
            --wait --timeout=5m
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/beegy/my-girok/issues
- Documentation: https://docs.example.com
