# Legal Service

> Consent management, legal documents, law registry, DSR handling

## Service Info

| Property | Value                     |
| -------- | ------------------------- |
| REST     | :3006                     |
| gRPC     | :50053                    |
| Database | legal_db (PostgreSQL)     |
| Cache    | Valkey DB 0               |
| Events   | `legal.*` (Redpanda)      |
| Codebase | `services/legal-service/` |

## Domain Boundaries

| This Service Owns | NOT This Service (Other Services)    |
| ----------------- | ------------------------------------ |
| Consents          | Accounts/Sessions (identity-service) |
| Legal Documents   | Roles/Permissions (auth-service)     |
| Law Registry      | Operators/Sanctions (auth-service)   |
| DSR Requests      | Devices/Profiles (identity-service)  |

## REST API

### Consents

| Method | Endpoint                       | Description             |
| ------ | ------------------------------ | ----------------------- |
| POST   | `/consents`                    | Grant consent           |
| GET    | `/consents`                    | List consents           |
| GET    | `/consents/:id`                | Get consent by ID       |
| DELETE | `/consents/:id`                | Revoke consent          |
| POST   | `/consents/bulk`               | Bulk grant consents     |
| GET    | `/consents/account/:accountId` | Get account consents    |
| POST   | `/consents/check`              | Check required consents |

### Legal Documents

| Method | Endpoint                       | Description         |
| ------ | ------------------------------ | ------------------- |
| POST   | `/legal-documents`             | Create document     |
| GET    | `/legal-documents`             | List documents      |
| GET    | `/legal-documents/:id`         | Get document by ID  |
| PATCH  | `/legal-documents/:id`         | Update document     |
| GET    | `/legal-documents/current`     | Get current version |
| POST   | `/legal-documents/:id/publish` | Publish document    |

Query params for `/legal-documents/current`:

- `type`: Document type (tos, privacy, etc.)
- `lang`: Language code
- `country`: Country code

### Law Registry

| Method | Endpoint                      | Description      |
| ------ | ----------------------------- | ---------------- |
| POST   | `/law-registry`               | Create law entry |
| GET    | `/law-registry`               | List law entries |
| GET    | `/law-registry/:id`           | Get law by ID    |
| PATCH  | `/law-registry/:id`           | Update law entry |
| GET    | `/law-registry/code/:code`    | Get by law code  |
| GET    | `/law-registry/country/:code` | Get by country   |

### DSR Requests (GDPR/PIPA)

| Method | Endpoint                     | Description        |
| ------ | ---------------------------- | ------------------ |
| POST   | `/dsr-requests`              | Create DSR request |
| GET    | `/dsr-requests`              | List DSR requests  |
| GET    | `/dsr-requests/:id`          | Get DSR by ID      |
| PATCH  | `/dsr-requests/:id`          | Update DSR request |
| POST   | `/dsr-requests/:id/complete` | Complete DSR       |
| GET    | `/dsr-requests/pending`      | Get pending DSRs   |

## gRPC Server (:50053)

| Method             | Description                      |
| ------------------ | -------------------------------- |
| CheckConsents      | Check if required consents given |
| GetAccountConsents | Get all consents for account     |
| GrantConsent       | Grant consent                    |
| RevokeConsent      | Withdraw/revoke consent          |
| GetCurrentDocument | Get current document version     |
| GetLawRequirements | Get requirements for country     |
| CreateDsrRequest   | Create GDPR/PIPA DSR request     |
| GetDsrRequest      | Get DSR request by ID            |

**Proto file**: `packages/proto/legal/v1/legal.proto`

## Database Tables

| Table            | Purpose                         |
| ---------------- | ------------------------------- |
| legal_documents  | Legal document versions         |
| consents         | User consent records            |
| consent_logs     | Consent change audit trail      |
| law_registry     | Law/regulation definitions      |
| dsr_requests     | GDPR/PIPA data subject requests |
| dsr_request_logs | DSR processing audit trail      |

## Events (Redpanda)

Events are published to `legal.*` topics:

```
CONSENT_GRANTED      - User granted consent
CONSENT_WITHDRAWN    - User withdrew consent
CONSENT_EXPIRED      - Consent expired

DOCUMENT_CREATED     - New document version
DOCUMENT_PUBLISHED   - Document published

DSR_REQUEST_SUBMITTED - DSR request created
DSR_REQUEST_COMPLETED - DSR request fulfilled
```

## Cache Keys (Valkey)

| Key Pattern                  | TTL  | Description                  |
| ---------------------------- | ---- | ---------------------------- |
| `consent:account:{id}`       | 5min | Account consent cache        |
| `consent:required:{country}` | 1h   | Required consents by country |
| `document:current:{type}`    | 1h   | Current document cache       |
| `law:code:{code}`            | 1h   | Law entry cache              |

## Environment Variables

```bash
# REST API port
PORT=3006

# gRPC port
GRPC_PORT=50053

# PostgreSQL database
DATABASE_URL=postgresql://user:password@host:5432/legal_db

# Valkey cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=0

# JWT for token validation
JWT_SECRET=your-jwt-secret

# API keys for service-to-service auth
API_KEYS=key1,key2

# DSR settings
DSR_DEFAULT_DUE_DAYS=30
```

---

**LLM Reference**: `docs/llm/services/legal-service.md`
