# Authorization Service - Deployment Guide

> Integration patterns, Helm deployment configuration, and monitoring for the authorization service.

## Overview

This guide covers how to integrate with the authorization service, deploy it using Helm, and monitor its health and performance.

## Integration

### Auth-BFF gRPC Client

The auth-bff service communicates with the authorization service via gRPC:

```typescript
@Injectable()
export class AuthorizationGrpcClient {
  async check(user: string, relation: string, object: string): Promise<boolean>;
  async write(writes: TupleKey[], deletes?: TupleKey[]): Promise<string>;
  async listObjects(user: string, relation: string, type: string): Promise<string[]>;
}
```

### REST Proxy Endpoints (via auth-bff)

The auth-bff exposes REST endpoints that proxy to the gRPC service:

| Endpoint                     | Method | Description                  |
| ---------------------------- | ------ | ---------------------------- |
| `/api/authorization/check`   | POST   | Check permission             |
| `/api/authorization/write`   | POST   | Write/delete tuples          |
| `/api/authorization/objects` | GET    | List objects user can access |
| `/api/authorization/users`   | GET    | List users with permission   |
| `/api/authorization/models`  | POST   | Create authorization model   |

### Authorization Guard

Use the `@AuthzCheck` decorator to protect endpoints:

```typescript
@AuthzCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdFrom: 'query',
  objectIdKey: 'serviceSlug',
})
async listSessions() {}
```

---

## Helm Deployment

### External Secrets (Vault Integration)

The service retrieves secrets from HashiCorp Vault:

| Vault Path                            | Key             | Description           |
| ------------------------------------- | --------------- | --------------------- |
| secret/my-girok/authorization-service | database-url    | PostgreSQL connection |
| secret/my-girok/authorization-service | valkey-password | Valkey password       |

### Values Configuration

```yaml
externalSecrets:
  enabled: true
  refreshInterval: '1h'
  secretStoreRef:
    name: 'vault-backend'
    kind: 'ClusterSecretStore'
  vault:
    path: 'secret/data/my-girok/authorization-service'

service:
  type: ClusterIP
  httpPort: 3012
  grpcPort: 50055

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
```

### Installation Commands

**Development Environment:**

```bash
cp values.yaml.example values.yaml
helm install authorization-service . -f values.yaml -n development
```

**Production Environment (with Vault):**

```bash
# Store secrets in Vault
vault kv put secret/my-girok/authorization-service \
  database-url="postgresql://..." \
  valkey-password="..."

# Deploy
helm install authorization-service . -f values.yaml -n production
```

---

## Monitoring

### Key Metrics

| Metric                    | Type      | Description                   |
| ------------------------- | --------- | ----------------------------- |
| `authz_check_duration_ms` | Histogram | Check operation latency       |
| `authz_check_cache_hit`   | Counter   | Cache hit rate for checks     |
| `authz_tuples_total`      | Gauge     | Total number of tuples stored |
| `authz_changelog_lag`     | Gauge     | Unprocessed changelog entries |

### Alerts to Configure

- **High Latency**: Alert when `authz_check_duration_ms` p99 exceeds 50ms
- **Cache Miss Rate**: Alert when cache hit rate drops below 80%
- **Changelog Lag**: Alert when unprocessed changes exceed 1000

---

## Related Documentation

- **Implementation Details**: `authorization-service-impl.md`
- **Main Documentation**: `authorization-service.md`

---

_This document is auto-generated from `docs/llm/services/authorization-service-impl-deployment.md`_
