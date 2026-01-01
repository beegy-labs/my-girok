# Identity Service Helm Chart

Identity Platform microservice for My-Girok with Account, Auth, and Legal modules.

## Features

- **Multi-Database Support**: 3 separate databases (identity_db, auth_db, legal_db)
- **gRPC + HTTP**: Dual protocol support (REST API + gRPC server)
- **CQRS Support**: Read/Write separation with replica configuration
- **ArgoCD Ready**: PreSync migration hooks for all 3 databases
- **Sealed Secrets**: Secure secret management

## Prerequisites

- Kubernetes 1.25+
- Helm 3.0+
- ArgoCD (for GitOps deployment)
- Sealed Secrets controller

## Installation

```bash
# Copy and configure values
cp values.yaml.example values.yaml
# Edit values.yaml with your settings

# Install
helm install my-girok-identity . -f values.yaml
```

## Configuration

### Databases (3 Separate DBs)

| Database    | Purpose                       | Env Variable          |
| ----------- | ----------------------------- | --------------------- |
| identity_db | Accounts, Sessions, Devices   | IDENTITY_DATABASE_URL |
| auth_db     | Roles, Permissions, Sanctions | AUTH_DATABASE_URL     |
| legal_db    | Consents, Documents, DSR      | LEGAL_DATABASE_URL    |

### CQRS (Read/Write Separation)

Enable CQRS to use read replicas for read operations:

```yaml
app:
  cqrs:
    enabled: true
    readReplica:
      poolSize: 10
      idleTimeout: 30000
```

Required secrets when CQRS is enabled:

- `identity-read-database-url`
- `auth-read-database-url`
- `legal-read-database-url`

### gRPC Server

The service exposes gRPC on port 50051 with the following services:

- Identity Service (Account, Session, Device, Profile)
- Auth Service (Permission, Role, Operator, Sanction)
- Legal Service (Consent, Document, Law, DSR)

### Module Modes

Configure module communication mode:

```yaml
app:
  moduleMode:
    identity: local # local | remote
    auth: local # local | remote
    legal: local # local | remote
```

- **local**: In-process module calls (current)
- **remote**: gRPC-based service calls (future, for service separation)

## Migration Order

Migrations run in ArgoCD PreSync hooks with sync-wave ordering:

1. **identity_db** (sync-wave: -5)
2. **auth_db** (sync-wave: -4)
3. **legal_db** (sync-wave: -3)

## Sealed Secrets

Generate sealed secrets:

```bash
kubectl create secret generic my-girok-identity-service-secret \
  --from-literal=identity-database-url="postgresql://user:pass@host:5432/identity_db" \
  --from-literal=auth-database-url="postgresql://user:pass@host:5432/auth_db" \
  --from-literal=legal-database-url="postgresql://user:pass@host:5432/legal_db" \
  --from-literal=jwt-private-key="..." \
  --from-literal=jwt-public-key="..." \
  --dry-run=client -o yaml | \
kubeseal --format yaml > sealed-secret.yaml
```

## Environment-Specific Values

Create separate values files:

- `values-dev.yaml` - Development
- `values-staging.yaml` - Staging (enable CQRS for testing)
- `values-prod.yaml` - Production (CQRS enabled)

```bash
helm install my-girok-identity . -f values.yaml -f values-prod.yaml
```

## Values Reference

| Key                            | Description               | Default |
| ------------------------------ | ------------------------- | ------- |
| `replicaCount`                 | Number of replicas        | `2`     |
| `service.httpPort`             | HTTP REST API port        | `3005`  |
| `service.grpcPort`             | gRPC server port          | `50051` |
| `app.cqrs.enabled`             | Enable CQRS read replicas | `false` |
| `app.moduleMode.*`             | Module communication mode | `local` |
| `app.outbox.pollingIntervalMs` | Outbox polling interval   | `5000`  |
| `app.redpanda.enabled`         | Enable Redpanda (Kafka)   | `false` |
| `migration.enabled`            | Enable DB migrations      | `true`  |
