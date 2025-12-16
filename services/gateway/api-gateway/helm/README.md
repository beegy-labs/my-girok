# API Gateway Helm Chart

High-performance Rust API Gateway for the my-girok platform.

## Features

- **JWT Authentication**: Centralized JWT validation
- **Rate Limiting**: Configurable request rate limiting with burst support
- **OpenTelemetry**: Distributed tracing and Prometheus metrics
- **High Performance**: Built with Rust/Axum for minimal latency
- **Kubernetes Native**: Health probes, HPA, Sealed Secrets

## Prerequisites

- Kubernetes 1.25+
- Helm 3.0+
- [kubeseal](https://github.com/bitnami-labs/sealed-secrets) (for production secrets)

## Installation

### 1. Copy example values

```bash
cp values.yaml.example values.yaml
```

### 2. Edit values.yaml

Update the following fields:
- `image.repository`: Your container registry
- `ingress.hosts[0].host`: Your domain
- `app.upstream.*`: Backend service URLs
- `app.corsOrigins`: Allowed CORS origins

### 3. Create Sealed Secret

```bash
# Generate sealed secret for JWT
kubectl create secret generic api-gateway-secret \
  --from-literal=jwt-secret="your-jwt-secret-same-as-auth-service" \
  --dry-run=client -o yaml | \
kubeseal --format yaml > sealed-secret.yaml

# Replace the template sealed-secret.yaml
cp sealed-secret.yaml templates/sealed-secret.yaml
```

### 4. Install the chart

```bash
helm install api-gateway . -f values.yaml --namespace my-girok --create-namespace
```

## Configuration

### Key Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `harbor.girok.dev/my-girok/api-gateway` |
| `app.port` | Gateway port | `4000` |
| `app.upstream.authService` | Auth service URL | `http://auth-service:4001` |
| `app.upstream.personalService` | Personal service URL | `http://personal-service:4002` |
| `app.upstream.webBff` | Web BFF URL | `http://web-bff:4010` |
| `app.rateLimit.requestsPerMinute` | Rate limit per minute | `1000` |
| `otel.enabled` | Enable OpenTelemetry | `false` |

### Resource Recommendations

| Environment | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-------------|-------------|-----------|----------------|--------------|
| Development | 50m | 250m | 32Mi | 64Mi |
| Staging | 100m | 500m | 64Mi | 128Mi |
| Production | 200m | 1000m | 128Mi | 256Mi |

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | General health status |
| `/health/live` | Kubernetes liveness probe |
| `/health/ready` | Kubernetes readiness probe |
| `/metrics` | Prometheus metrics |

## Upgrading

```bash
helm upgrade api-gateway . -f values.yaml --namespace my-girok
```

## Uninstalling

```bash
helm uninstall api-gateway --namespace my-girok
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n my-girok -l app.kubernetes.io/name=api-gateway
```

### View logs
```bash
kubectl logs -n my-girok -l app.kubernetes.io/name=api-gateway -f
```

### Check endpoints
```bash
kubectl get endpoints -n my-girok api-gateway
```

## Architecture

```
Internet → Ingress → API Gateway (4000) → Web BFF (4010) → Backend Services
                           ↓
                    auth-service (4001)
                    personal-service (4002)
```
