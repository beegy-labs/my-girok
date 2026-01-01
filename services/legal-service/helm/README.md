# My-Girok Legal Service Helm Chart

Kubernetes Helm Chart for My-Girok Legal and Compliance microservice (GDPR, Consent, DSR).

## Overview

Legal Service handles all legal compliance requirements:

- **Consents**: User consent management (GDPR Article 7)
- **DSR Requests**: Data Subject Rights (GDPR Articles 15-22)
- **Legal Documents**: Terms, Privacy Policy, versioning
- **Law Registry**: Applicable laws by country

## Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured with cluster access
- External Secrets Operator (ESO) installed
- PostgreSQL 16+ (legal_db)

## Quick Start

### 1. Configure Vault Secrets

```bash
# Path: secret/apps/my-girok/{env}/legal-service/postgres
vault kv put secret/apps/my-girok/dev/legal-service/postgres \
  username="legal_dev" \
  password="your-secure-password" \
  host="db-postgres-001.example.com" \
  port="5432" \
  database="legal_dev"

# Path: secret/apps/my-girok/{env}/legal-service/valkey
vault kv put secret/apps/my-girok/dev/legal-service/valkey \
  host="valkey.example.com" \
  port="6379" \
  password="your-valkey-password"
```

### 2. Install the Chart

```bash
# Development
helm install legal-service ./helm \
  -f helm/values-development.yaml \
  --namespace dev-my-girok \
  --create-namespace

# Production
helm install legal-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok \
  --create-namespace
```

## Configuration

### Key Configuration Options

| Parameter           | Description              | Default                                     |
| ------------------- | ------------------------ | ------------------------------------------- |
| `replicaCount`      | Number of replicas       | `2`                                         |
| `image.repository`  | Image repository         | `ghcr.io/beegy-labs/my-girok/legal-service` |
| `service.port`      | Service port             | `3005`                                      |
| `migration.enabled` | Enable goose migration   | `true`                                      |
| `valkey.enabled`    | Enable Valkey connection | `true`                                      |

### Database Schema

| Table             | Description                   |
| ----------------- | ----------------------------- |
| `consents`        | User consent records          |
| `dsr_requests`    | Data Subject Request tracking |
| `legal_documents` | Legal document versions       |
| `law_registries`  | Applicable laws by country    |

## API Endpoints

### Consents

| Endpoint                          | Method | Description              |
| --------------------------------- | ------ | ------------------------ |
| `/v1/consents`                    | POST   | Record consent           |
| `/v1/consents/:id`                | GET    | Get consent              |
| `/v1/consents/account/:accountId` | GET    | List consents by account |
| `/v1/consents/:id/withdraw`       | POST   | Withdraw consent         |

### DSR Requests (GDPR Articles 15-22)

| Endpoint                              | Method | Description        |
| ------------------------------------- | ------ | ------------------ |
| `/v1/dsr-requests`                    | POST   | Create DSR request |
| `/v1/dsr-requests/:id`                | GET    | Get DSR request    |
| `/v1/dsr-requests/:id`                | PATCH  | Update DSR status  |
| `/v1/dsr-requests/account/:accountId` | GET    | List by account    |

### Legal Documents

| Endpoint                           | Method | Description          |
| ---------------------------------- | ------ | -------------------- |
| `/v1/legal-documents`              | GET    | List documents       |
| `/v1/legal-documents/:id`          | GET    | Get document         |
| `/v1/legal-documents/active`       | GET    | Get active documents |
| `/v1/legal-documents`              | POST   | Create document      |
| `/v1/legal-documents/:id/activate` | PATCH  | Activate document    |

### Law Registry

| Endpoint                      | Method | Description              |
| ----------------------------- | ------ | ------------------------ |
| `/v1/law-registry`            | GET    | List laws                |
| `/v1/law-registry/:id`        | GET    | Get law                  |
| `/v1/law-registry/code/:code` | GET    | Get by code (GDPR, CCPA) |

## Compliance Features

### GDPR Compliance

- Consent management with purpose limitation
- Right to access (Article 15)
- Right to rectification (Article 16)
- Right to erasure (Article 17)
- Right to data portability (Article 20)
- DSR request tracking with SLA monitoring

### Consent Types

| Type          | Description                 |
| ------------- | --------------------------- |
| `TERMS`       | Terms of Service acceptance |
| `PRIVACY`     | Privacy Policy acceptance   |
| `MARKETING`   | Marketing communications    |
| `ANALYTICS`   | Analytics data collection   |
| `THIRD_PARTY` | Third-party data sharing    |

### DSR Request Types

| Type            | GDPR Article | SLA     |
| --------------- | ------------ | ------- |
| `ACCESS`        | Article 15   | 30 days |
| `RECTIFICATION` | Article 16   | 30 days |
| `ERASURE`       | Article 17   | 30 days |
| `PORTABILITY`   | Article 20   | 30 days |
| `RESTRICTION`   | Article 18   | 30 days |
| `OBJECTION`     | Article 21   | 30 days |

## Upgrade

```bash
helm upgrade legal-service ./helm \
  -f helm/values-production.yaml \
  --namespace my-girok
```

## Rollback

```bash
helm rollback legal-service -n my-girok
```

## Security

### Data Retention

- Consent records: Retained for legal compliance
- DSR requests: 3 years after completion
- Legal documents: Permanent (versioned)

### Audit Trail

All operations are logged to audit-service for compliance.

## Monitoring

### Health Checks

- Liveness: `GET /health`
- Readiness: `GET /health`

### Key Metrics

- `legal_consents_total` - Total consents recorded
- `legal_dsr_requests_pending` - Pending DSR requests
- `legal_dsr_requests_sla_breach` - SLA breaches

### Alerts

```yaml
- alert: DSRRequestSLABreach
  expr: legal_dsr_requests_sla_breach > 0
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: 'DSR request SLA breach detected'
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n my-girok -l app.kubernetes.io/name=legal-service
```

### View Logs

```bash
kubectl logs -f deployment/legal-service -n my-girok
```

### Migration Issues

```bash
kubectl logs job/legal-service-migrate -n my-girok
```

## GitOps Integration

Deployed via ArgoCD:

- `platform-gitops/apps/my-girok/legal-service/`
- `platform-gitops/clusters/home/values/my-girok-legal-service-{env}.yaml`

## Support

GitHub Issues: https://github.com/beegy-labs/my-girok/issues
