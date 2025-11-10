# My-Girok Web Main Application Helm Chart

Kubernetes Helm Chart for My-Girok main web application - A React-based frontend for blog, finance tracker, and resume features.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- Harbor registry access (harbor.girok.dev)
- Auth Service and other backend services deployed

## Quick Start

### 1. Copy Example Values

```bash
cd apps/web-main/helm
cp values.yaml.example values.yaml
```

### 2. Edit Configuration

```bash
nano values.yaml
```

Update the following:
- `image.repository` - Harbor registry path (harbor.girok.dev/my-girok/web-main)
- `image.tag` - Image version (develop/release/v1.0.0)
- `ingress.hosts` - Your domain
- `app.apiUrl` - Unified API gateway URL for auth (e.g., https://my-api.example.com/auth)
- `app.personalApiUrl` - Unified API gateway URL for personal service (e.g., https://my-api.example.com/personal)

### 3. Install the Chart

```bash
# Development (develop branch)
helm install web-main . \
  -f values.yaml \
  --set image.tag=develop \
  --namespace my-girok-dev \
  --create-namespace

# Main Branch (release)
helm install web-main . \
  -f values.yaml \
  --set image.tag=release \
  --namespace my-girok-prod \
  --create-namespace

# Production (version tag)
helm install web-main . \
  -f values.yaml \
  --set image.tag=v1.0.0 \
  --namespace my-girok-prod \
  --create-namespace
```

## Configuration

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `harbor.girok.dev/my-girok/web-main` |
| `image.tag` | Image tag (develop/release/v1.0.0) | Chart appVersion |
| `service.port` | Service port | `80` |
| `service.targetPort` | Container port | `3000` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts` | Ingress hosts | `app.example.com` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Min replicas | `2` |
| `autoscaling.maxReplicas` | Max replicas | `5` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `256Mi` |
| `app.apiUrl` | Unified API gateway URL for auth | `https://my-api.example.com/auth` |
| `app.personalApiUrl` | Unified API gateway URL for personal | `https://my-api.example.com/personal` |
| `app.rybbitSiteId` | Rybbit Analytics Site ID | `4bc4e6b821e8` |

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

**Important**: The API URLs must be set at build time (not runtime) for Vite applications.

```bash
# From repository root
docker build \
  --build-arg VITE_API_URL=https://my-api.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:v0.1.0 \
  -f apps/web-main/Dockerfile \
  .

# Push to Harbor registry
docker push harbor.girok.dev/my-girok/web-main:v0.1.0
```

### Multi-Environment Builds

Build separate images for each environment:

```bash
# Development (develop branch)
docker build \
  --build-arg VITE_API_URL=https://my-api-dev.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api-dev.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:develop \
  -f apps/web-main/Dockerfile .
docker push harbor.girok.dev/my-girok/web-main:develop

# Main Branch (release)
docker build \
  --build-arg VITE_API_URL=https://my-api.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:release \
  -f apps/web-main/Dockerfile .
docker push harbor.girok.dev/my-girok/web-main:release

# Production (version tag)
docker build \
  --build-arg VITE_API_URL=https://my-api.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:v1.0.0 \
  -f apps/web-main/Dockerfile .
docker push harbor.girok.dev/my-girok/web-main:v1.0.0
```

## Upgrade

```bash
# Upgrade with new values
helm upgrade web-main . \
  -f values.yaml \
  --namespace my-girok-prod

# Upgrade with new image version
helm upgrade web-main . \
  --set image.tag=v0.2.0 \
  --namespace my-girok-prod
```

## Rollback

```bash
# List releases
helm history web-main -n my-girok-prod

# Rollback to previous version
helm rollback web-main -n my-girok-prod

# Rollback to specific revision
helm rollback web-main 1 -n my-girok-prod
```

## Uninstall

```bash
helm uninstall web-main --namespace my-girok-prod
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
  name: web-main-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: web-main
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
kubectl logs -f deployment/web-main -n my-girok-prod
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok-prod -l app.kubernetes.io/name=web-main
```

### View Logs

```bash
kubectl logs -f deployment/web-main -n my-girok-prod
```

### Check Service

```bash
kubectl get svc -n my-girok-prod -l app.kubernetes.io/name=web-main
```

### Check Ingress

```bash
kubectl get ingress -n my-girok-prod
kubectl describe ingress web-main -n my-girok-prod
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

# Build and push to Harbor
docker build \
  --build-arg VITE_API_URL=https://my-api-dev.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api-dev.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:develop \
  -f apps/web-main/Dockerfile .
docker push harbor.girok.dev/my-girok/web-main:develop

# Deploy
helm upgrade --install web-main ./apps/web-main/helm \
  -f apps/web-main/helm/values-dev.yaml \
  --namespace my-girok-dev \
  --set image.tag=develop
```

### Main Branch → Production Environment

```bash
git checkout main
git pull origin main

# Build and push release tag to Harbor
docker build \
  --build-arg VITE_API_URL=https://my-api.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:release \
  -f apps/web-main/Dockerfile .
docker push harbor.girok.dev/my-girok/web-main:release

# Deploy
helm upgrade --install web-main ./apps/web-main/helm \
  -f apps/web-main/helm/values-prod.yaml \
  --namespace my-girok-prod \
  --set image.tag=release
```

### Production Release (Version Tag)

```bash
# Tag and build specific version
git tag v0.2.0
git push origin v0.2.0

docker build \
  --build-arg VITE_API_URL=https://my-api.example.com/auth \
  --build-arg VITE_PERSONAL_API_URL=https://my-api.example.com/personal \
  -t harbor.girok.dev/my-girok/web-main:v0.2.0 \
  -f apps/web-main/Dockerfile .
docker push harbor.girok.dev/my-girok/web-main:v0.2.0

# Deploy
helm upgrade --install web-main ./apps/web-main/helm \
  -f apps/web-main/helm/values-prod.yaml \
  --namespace my-girok-prod \
  --set image.tag=v0.2.0
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy-web-main-production.yml
name: Deploy Web Main to Production

on:
  push:
    branches: [main, develop]
    tags: ['v*']
    paths:
      - 'apps/web-main/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Harbor
        run: |
          echo "${{ secrets.HARBOR_PASSWORD }}" | docker login harbor.girok.dev -u "${{ secrets.HARBOR_USERNAME }}" --password-stdin

      - name: Determine image tag
        id: tag
        run: |
          if [[ $GITHUB_REF == refs/tags/* ]]; then
            echo "tag=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
          elif [[ $GITHUB_REF == refs/heads/main ]]; then
            echo "tag=release" >> $GITHUB_OUTPUT
          elif [[ $GITHUB_REF == refs/heads/develop ]]; then
            echo "tag=develop" >> $GITHUB_OUTPUT
          fi

      - name: Build and push Docker image
        run: |
          docker build \
            --build-arg VITE_API_URL=https://my-api.example.com/auth \
            --build-arg VITE_PERSONAL_API_URL=https://my-api.example.com/personal \
            -t harbor.girok.dev/my-girok/web-main:${{ steps.tag.outputs.tag }} \
            -f apps/web-main/Dockerfile .
          docker push harbor.girok.dev/my-girok/web-main:${{ steps.tag.outputs.tag }}

      - name: Install kubectl
        uses: azure/setup-kubectl@v3

      - name: Install helm
        uses: azure/setup-helm@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > ~/.kube/config

      - name: Deploy to Kubernetes
        run: |
          helm upgrade --install web-main ./apps/web-main/helm \
            -f apps/web-main/helm/values-prod.yaml \
            --namespace my-girok-prod \
            --set image.tag=${{ steps.tag.outputs.tag }} \
            --wait --timeout=5m
```

## Best Practices

### 1. Multi-Stage Deployment

Deploy to environments in order:
1. Development (automatic on push to develop)
2. Staging (manual promotion or automatic on release branch)
3. Production (manual promotion with approval)

### 2. Image Tagging Strategy

- Development (develop branch): `develop`
- Main branch: `release`
- Production releases: `v<semver>` (e.g., `v0.1.0`, `v1.0.0`)

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
