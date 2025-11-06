# My-Girok Web Test Application Helm Chart

Kubernetes Helm Chart for My-Girok test web application - A React-based frontend for testing the authentication system.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- Auth Service deployed and accessible

## Important Note

**This is a test/demo application** designed for testing the My-Girok authentication system. For production use, consider:
- Building a production-ready application
- Implementing proper error handling and monitoring
- Using a CDN for static assets
- Adding analytics and logging

## Quick Start

### 1. Copy Example Values

```bash
cd apps/web-test/helm
cp values.yaml.example values.yaml
```

### 2. Edit Configuration

```bash
nano values.yaml
```

Update the following:
- `image.repository` - Your container registry
- `image.tag` - Image version
- `ingress.hosts` - Your domain
- `app.apiUrl` - Auth service API URL

### 3. Install the Chart

```bash
# Development
helm install my-girok-web-test . \
  -f values.yaml \
  --namespace my-girok-dev \
  --create-namespace

# Staging
helm install my-girok-web-test . \
  -f values.yaml \
  --namespace my-girok-staging \
  --create-namespace

# Production
helm install my-girok-web-test . \
  -f values.yaml \
  --namespace my-girok-prod \
  --create-namespace
```

## Configuration

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `your-registry.io/my-girok/web-test` |
| `image.tag` | Image tag | Chart appVersion |
| `service.port` | Service port | `80` |
| `service.targetPort` | Container port | `3000` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts` | Ingress hosts | `app.example.com` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Min replicas | `2` |
| `autoscaling.maxReplicas` | Max replicas | `5` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `256Mi` |
| `app.apiUrl` | Auth service API URL | `https://auth-api.example.com/api/v1` |

### Environment-Specific Configuration

Create separate values files for each environment:

```bash
# Development
cp values.yaml values-dev.yaml
# Edit: lower resources, dev domain, dev API URL

# Staging
cp values.yaml values-staging.yaml
# Edit: medium resources, staging domain, staging API URL

# Production
cp values.yaml values-prod.yaml
# Edit: higher resources, prod domain, prod API URL
```

## Building the Docker Image

**Important**: The API URL must be set at build time (not runtime) for Vite applications.

```bash
# From repository root
docker build \
  --build-arg VITE_API_URL=https://auth-api.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:v0.1.0 \
  -f apps/web-test/Dockerfile \
  .

# Push to registry
docker push your-registry.io/my-girok/web-test:v0.1.0
```

### Multi-Environment Builds

Build separate images for each environment:

```bash
# Development
docker build \
  --build-arg VITE_API_URL=https://auth-api-dev.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:dev \
  -f apps/web-test/Dockerfile .

# Staging
docker build \
  --build-arg VITE_API_URL=https://auth-api-staging.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:staging \
  -f apps/web-test/Dockerfile .

# Production
docker build \
  --build-arg VITE_API_URL=https://auth-api.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:latest \
  -f apps/web-test/Dockerfile .
```

## Upgrade

```bash
# Upgrade with new values
helm upgrade my-girok-web-test . \
  -f values.yaml \
  --namespace my-girok-prod

# Upgrade with new image version
helm upgrade my-girok-web-test . \
  --set image.tag=v0.2.0 \
  --namespace my-girok-prod
```

## Rollback

```bash
# List releases
helm history my-girok-web-test -n my-girok-prod

# Rollback to previous version
helm rollback my-girok-web-test -n my-girok-prod

# Rollback to specific revision
helm rollback my-girok-web-test 1 -n my-girok-prod
```

## Uninstall

```bash
helm uninstall my-girok-web-test --namespace my-girok-prod
```

## Security

### Pod Security

The chart includes:
- Non-root user (UID 1000)
- Dropped capabilities
- No privilege escalation
- Limited filesystem access

### Network Security

```yaml
# Example NetworkPolicy (apply separately)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-test-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: web-test
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
```

## Monitoring

### Health Checks

The application exposes a health endpoint:

- Health: `GET /health`
- Returns: `200 OK` with "healthy" text

### Access Logs

```bash
kubectl logs -f deployment/my-girok-web-test -n my-girok-prod
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok-prod -l app.kubernetes.io/name=web-test
```

### View Logs

```bash
kubectl logs -f deployment/my-girok-web-test -n my-girok-prod
```

### Check Service

```bash
kubectl get svc -n my-girok-prod -l app.kubernetes.io/name=web-test
```

### Check Ingress

```bash
kubectl get ingress -n my-girok-prod
kubectl describe ingress my-girok-web-test -n my-girok-prod
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

#### 2. 502 Bad Gateway

Check if:
- Pods are running: `kubectl get pods -n my-girok-prod`
- Readiness probe is passing
- Service is correctly configured

```bash
kubectl describe pod <pod-name> -n my-girok-prod
```

#### 3. API Connection Issues

If the frontend cannot connect to the auth service:

1. Verify API URL was set correctly at build time
2. Check CORS configuration on auth service
3. Verify network connectivity between services

```bash
# Test from pod
kubectl exec -it <pod-name> -n my-girok-prod -- sh
# Inside pod:
# wget -O- http://auth-service-url/api/v1/health
```

#### 4. Static Files Not Loading

Check nginx configuration and volume mounts:

```bash
kubectl exec -it <pod-name> -n my-girok-prod -- sh
# Inside pod:
# ls -la /usr/share/nginx/html
# cat /etc/nginx/conf.d/default.conf
```

## Git Flow Integration

### Development Branch → Development Environment

```bash
git checkout develop
git pull origin develop

# Build dev image
docker build \
  --build-arg VITE_API_URL=https://auth-api-dev.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:dev-$(git rev-parse --short HEAD) \
  -f apps/web-test/Dockerfile .
docker push your-registry.io/my-girok/web-test:dev-$(git rev-parse --short HEAD)

# Deploy
helm upgrade --install my-girok-web-test ./apps/web-test/helm \
  -f apps/web-test/helm/values-dev.yaml \
  --namespace my-girok-dev \
  --set image.tag=dev-$(git rev-parse --short HEAD)
```

### Release Branch → Staging Environment

```bash
git checkout release/v0.2.0
git pull origin release/v0.2.0

# Build staging image
docker build \
  --build-arg VITE_API_URL=https://auth-api-staging.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:staging-$(git rev-parse --short HEAD) \
  -f apps/web-test/Dockerfile .
docker push your-registry.io/my-girok/web-test:staging-$(git rev-parse --short HEAD)

# Deploy
helm upgrade --install my-girok-web-test ./apps/web-test/helm \
  -f apps/web-test/helm/values-staging.yaml \
  --namespace my-girok-staging \
  --set image.tag=staging-$(git rev-parse --short HEAD)
```

### Main Branch → Production Environment

```bash
git checkout main
git pull origin main

# Build production image
docker build \
  --build-arg VITE_API_URL=https://auth-api.example.com/api/v1 \
  -t your-registry.io/my-girok/web-test:v0.2.0 \
  -f apps/web-test/Dockerfile .
docker push your-registry.io/my-girok/web-test:v0.2.0

# Deploy
helm upgrade --install my-girok-web-test ./apps/web-test/helm \
  -f apps/web-test/helm/values-prod.yaml \
  --namespace my-girok-prod \
  --set image.tag=v0.2.0
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy-web-test-production.yml
name: Deploy Web Test to Production

on:
  push:
    branches: [main]
    tags: ['v*']
    paths:
      - 'apps/web-test/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build \
            --build-arg VITE_API_URL=https://auth-api.example.com/api/v1 \
            -t your-registry.io/my-girok/web-test:${GITHUB_REF#refs/tags/} \
            -f apps/web-test/Dockerfile .
          docker push your-registry.io/my-girok/web-test:${GITHUB_REF#refs/tags/}

      - name: Install kubectl
        uses: azure/setup-kubectl@v3

      - name: Install helm
        uses: azure/setup-helm@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > ~/.kube/config

      - name: Deploy to Kubernetes
        run: |
          helm upgrade --install my-girok-web-test ./apps/web-test/helm \
            -f apps/web-test/helm/values-prod.yaml \
            --namespace my-girok-prod \
            --set image.tag=${GITHUB_REF#refs/tags/} \
            --wait --timeout=5m
```

## Best Practices

### 1. Multi-Stage Deployment

Deploy to environments in order:
1. Development (automatic on push to develop)
2. Staging (manual promotion or automatic on release branch)
3. Production (manual promotion with approval)

### 2. Image Tagging Strategy

- Development: `dev-<git-hash>`
- Staging: `staging-<git-hash>`
- Production: `v<semver>` (e.g., `v0.1.0`)

### 3. Resource Allocation

| Environment | Replicas | CPU Limit | Memory Limit |
|-------------|----------|-----------|--------------|
| Development | 1 | 250m | 128Mi |
| Staging | 2 | 400m | 192Mi |
| Production | 2-3 | 500m | 256Mi |

### 4. Monitoring

Set up monitoring for:
- Pod availability
- Response times
- HTTP error rates
- Resource usage

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/my-girok/issues
- Documentation: https://docs.example.com
