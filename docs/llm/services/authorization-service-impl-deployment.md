# Authorization Service - Deployment

> Integration, Helm deployment, and monitoring

## Integration

### auth-bff Client

```typescript
@Injectable()
export class AuthorizationGrpcClient {
  async check(user: string, relation: string, object: string): Promise<boolean>;
  async write(writes: TupleKey[], deletes?: TupleKey[]): Promise<string>;
  async listObjects(user: string, relation: string, type: string): Promise<string[]>;
}
```

### REST Proxy (auth-bff)

```
POST /api/authorization/check
POST /api/authorization/write
GET  /api/authorization/objects
GET  /api/authorization/users
POST /api/authorization/models
```

### Guard

```typescript
@AuthzCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdFrom: 'query',
  objectIdKey: 'serviceSlug',
})
async listSessions() {}
```

## Helm Deployment

### External Secrets (Vault)

| Vault Path                            | Key             | Description           |
| ------------------------------------- | --------------- | --------------------- |
| secret/my-girok/authorization-service | database-url    | PostgreSQL connection |
| secret/my-girok/authorization-service | valkey-password | Valkey password       |

### Values

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

### Installation

```bash
# Dev
cp values.yaml.example values.yaml
helm install authorization-service . -f values.yaml -n development

# Prod (Vault)
vault kv put secret/my-girok/authorization-service \
  database-url="postgresql://..." \
  valkey-password="..."
helm install authorization-service . -f values.yaml -n production
```

## Monitoring

| Metric                  | Type      | Description         |
| ----------------------- | --------- | ------------------- |
| authz_check_duration_ms | Histogram | Check latency       |
| authz_check_cache_hit   | Counter   | Cache hit rate      |
| authz_tuples_total      | Gauge     | Total tuples        |
| authz_changelog_lag     | Gauge     | Unprocessed changes |

---

_Main: `authorization-service-impl.md`_
