# Authorization Service Helm Chart

Zanzibar-style ReBAC (Relationship-Based Access Control) Authorization Service for My-Girok.

## Overview

This Helm chart deploys the authorization-service, which provides:

- Zanzibar-style permission checking via gRPC
- DSL-based authorization model management
- Tuple storage for relationship data
- Multi-level caching (L1 in-memory + L2 Valkey)

## Prerequisites

- Kubernetes 1.24+
- Helm 3.x
- PostgreSQL database
- Valkey/Redis (optional, for L2 cache)
- External Secrets Operator (ESO) with Vault ClusterSecretStore

## Installation

### Development

```bash
# Copy and edit values
cp values.yaml.example values.yaml
vim values.yaml

# Install
helm install authorization-service . -f values.yaml -n development
```

### Production

```bash
# 1. Store secrets in Vault
vault kv put secret/my-girok/authorization-service \
  database-url="postgresql://user:pass@host:5432/authorization_db" \
  valkey-password="your-valkey-password"

# 2. Install with production values (ESO syncs secrets automatically)
helm install authorization-service . -f values.yaml -n production
```

## Configuration

### Key Values

| Parameter            | Description                                   | Default |
| -------------------- | --------------------------------------------- | ------- |
| `replicaCount`       | Number of replicas                            | `2`     |
| `service.httpPort`   | HTTP port for REST API                        | `3012`  |
| `service.grpcPort`   | gRPC port for internal communication          | `50055` |
| `app.check.maxDepth` | Maximum recursion depth for permission checks | `25`    |
| `app.cache.l1TtlMs`  | L1 cache TTL in milliseconds                  | `30000` |
| `app.cache.l2TtlSec` | L2 cache TTL in seconds                       | `300`   |

### External Secrets (Vault)

| Vault Path                              | Key               | Description                  |
| --------------------------------------- | ----------------- | ---------------------------- |
| `secret/my-girok/authorization-service` | `database-url`    | PostgreSQL connection string |
| `secret/my-girok/authorization-service` | `valkey-password` | Valkey password (optional)   |

## Architecture

```
                    ┌─────────────────────┐
                    │    auth-bff         │
                    │  (gRPC Client)      │
                    └──────────┬──────────┘
                               │ gRPC (50055)
                    ┌──────────▼──────────┐
                    │ authorization-service│
                    │  ┌───────────────┐  │
                    │  │  Check Engine │  │
                    │  │  DSL Parser   │  │
                    │  │  Cache Layer  │  │
                    │  └───────────────┘  │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
    │  PostgreSQL   │  │    Valkey     │  │  Bloom Filter │
    │ (Tuple Store) │  │  (L2 Cache)   │  │ (In-Memory)   │
    └───────────────┘  └───────────────┘  └───────────────┘
```

## Health Checks

- **Liveness Probe**: `GET /health` on HTTP port
- **Readiness Probe**: `GET /health` on HTTP port

## Scaling

The service supports horizontal scaling with:

- HPA based on CPU/Memory utilization
- Pod anti-affinity for high availability
- L2 cache (Valkey) shared across instances

## Monitoring

When OpenTelemetry is enabled:

- Traces exported to OTLP endpoint
- Metrics exported to OTLP endpoint
- Service name: `authorization-service`

## Upgrading

```bash
helm upgrade authorization-service . -f values.yaml -n production
```

## Uninstalling

```bash
helm uninstall authorization-service -n production
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=authorization-service -n production
```

### View Logs

```bash
kubectl logs -l app.kubernetes.io/name=authorization-service -n production -f
```

### Test gRPC Connection

```bash
grpcurl -plaintext localhost:50055 authorization.v1.AuthorizationService/Check
```
