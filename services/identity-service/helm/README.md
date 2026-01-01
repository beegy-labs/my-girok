# My-Girok Identity Service Helm Chart

Kubernetes Helm Chart for My-Girok Identity Platform microservice (Multi-app User Management).

## Overview

Identity Service is the core user management platform that handles:

- **Accounts**: Global user accounts across all applications
- **Sessions**: Session management with device tracking
- **Devices**: Device registration and trust management
- **Profiles**: User profile data management

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- External Secrets Operator (ESO) installed for secret management
- PostgreSQL 16+ (identity_db)

## Quick Start

### 1. Install External Secrets Operator (if not already installed)

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### 2. Configure Vault Secrets

Ensure the following secrets exist in Vault:

```bash
# Path: secret/apps/my-girok/{env}/identity-service/postgres
vault kv put secret/apps/my-girok/dev/identity-service/postgres \
  username="identity_dev" \
  password="your-secure-password" \
  host="db-postgres-001.example.com" \
  port="5432" \
  database="identity_dev"

# Path: secret/apps/my-girok/{env}/identity-service/valkey
vault kv put secret/apps/my-girok/dev/identity-service/valkey \
  host="valkey.example.com" \
  port="6379" \
  password="your-valkey-password"

# Path: secret/apps/my-girok/{env}/identity-service/jwt
vault kv put secret/apps/my-girok/dev/identity-service/jwt \
  secret="your-jwt-secret-min-32-chars" \
  refresh_secret="your-refresh-secret-min-32-chars"
```

### 3. Install the Chart

```bash
# Development
helm install identity-service ./helm \
  -f helm/values-development.yaml \
  --namespace dev-my-girok \
  --create-namespace

# Release (Staging)
helm install identity-service ./helm \
  -f helm/values-release.yaml \
  --namespace release-my-girok \
  --create-namespace

# Production
helm install identity-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok \
  --create-namespace
```

## Architecture

### Single Database Architecture

Identity Service uses a single PostgreSQL database (`identity_db`) containing:

| Table           | Description                     |
| --------------- | ------------------------------- |
| `accounts`      | Global user accounts            |
| `sessions`      | Active sessions                 |
| `devices`       | Registered devices              |
| `profiles`      | User profile data               |
| `outbox_events` | Transactional outbox for events |

### Event-Driven Architecture

Identity Service publishes events via Kafka/Redpanda:

| Topic                     | Events                                         |
| ------------------------- | ---------------------------------------------- |
| `identity.account.events` | AccountCreated, AccountUpdated, AccountDeleted |
| `identity.session.events` | SessionCreated, SessionRevoked                 |
| `identity.device.events`  | DeviceRegistered, DeviceTrusted                |
| `identity.profile.events` | ProfileUpdated                                 |

## Configuration

### Key Configuration Options

| Parameter           | Description              | Default                                        |
| ------------------- | ------------------------ | ---------------------------------------------- |
| `replicaCount`      | Number of replicas       | `2`                                            |
| `image.repository`  | Image repository         | `ghcr.io/beegy-labs/my-girok/identity-service` |
| `image.tag`         | Image tag                | Chart appVersion                               |
| `service.port`      | Service port             | `3000`                                         |
| `migration.enabled` | Enable goose migration   | `true`                                         |
| `valkey.enabled`    | Enable Valkey connection | `true`                                         |
| `kafka.enabled`     | Enable Kafka connection  | `true`                                         |

### Database Migration (goose)

Migrations run automatically via ArgoCD PreSync hook:

```yaml
migration:
  enabled: true
```

## API Endpoints

### Accounts

| Endpoint           | Method | Description         |
| ------------------ | ------ | ------------------- |
| `/v1/accounts`     | POST   | Create account      |
| `/v1/accounts/:id` | GET    | Get account by ID   |
| `/v1/accounts/:id` | PATCH  | Update account      |
| `/v1/accounts/:id` | DELETE | Soft delete account |

### Sessions

| Endpoint                          | Method | Description              |
| --------------------------------- | ------ | ------------------------ |
| `/v1/sessions`                    | POST   | Create session           |
| `/v1/sessions/:id`                | GET    | Get session              |
| `/v1/sessions/:id/revoke`         | POST   | Revoke session           |
| `/v1/sessions/account/:accountId` | GET    | List sessions by account |

### Devices

| Endpoint                         | Method | Description             |
| -------------------------------- | ------ | ----------------------- |
| `/v1/devices`                    | POST   | Register device         |
| `/v1/devices/:id`                | GET    | Get device              |
| `/v1/devices/:id/trust`          | POST   | Trust device            |
| `/v1/devices/account/:accountId` | GET    | List devices by account |

### Profiles

| Endpoint                  | Method | Description    |
| ------------------------- | ------ | -------------- |
| `/v1/profiles/:accountId` | GET    | Get profile    |
| `/v1/profiles/:accountId` | PUT    | Update profile |

## Upgrade

```bash
helm upgrade identity-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok
```

## Rollback

```bash
helm rollback identity-service -n my-girok
```

## Security

### Best Practices

1. **JWT Secrets**: Rotate every 90 days
2. **Database**: Use SSL connections
3. **Network Policies**: Restrict ingress/egress
4. **Pod Security**: Non-root, read-only filesystem

### Network Policy Example

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: identity-service-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: identity-service
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
          port: 3000
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 5432 # PostgreSQL
        - protocol: TCP
          port: 6379 # Valkey
        - protocol: TCP
          port: 9092 # Kafka
```

## Monitoring

### Health Checks

- Liveness: `GET /health`
- Readiness: `GET /health`

### Key Metrics

- `identity_accounts_total` - Total accounts
- `identity_sessions_active` - Active sessions
- `identity_devices_registered` - Registered devices

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok -l app.kubernetes.io/name=identity-service
```

### View Logs

```bash
kubectl logs -f deployment/identity-service -n my-girok
```

### Migration Issues

```bash
kubectl logs job/identity-service-migrate -n my-girok
```

## GitOps Integration

Deployed via ArgoCD:

- `platform-gitops/apps/my-girok/identity-service/`
- `platform-gitops/clusters/home/values/my-girok-identity-service-{env}.yaml`

## Support

GitHub Issues: https://github.com/beegy-labs/my-girok/issues
