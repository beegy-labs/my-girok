# Legal Service

> Consent management, legal documents, law registry, DSR handling | **Last Updated**: 2026-01-06

## Service Info

| Property | Value                     |
| -------- | ------------------------- |
| REST     | :3005                     |
| gRPC     | :50053                    |
| Database | legal_db (PostgreSQL)     |
| Cache    | Valkey DB 0               |
| Events   | `legal.*` (Redpanda)      |
| Codebase | `services/legal-service/` |

## Domain Boundaries

| This Service           | NOT This Service              |
| ---------------------- | ----------------------------- |
| Consents, Consent Logs | Accounts, Sessions (identity) |
| Legal Documents        | Roles, Permissions (auth)     |
| Law Registry           | Operators, Sanctions (auth)   |
| DSR Requests           | Devices, Profiles (identity)  |

## REST API

```
POST/GET/DELETE  /consents, /consents/:id
POST  /consents/bulk
GET   /consents/account/:accountId
POST  /consents/check

POST/GET/PATCH  /legal-documents, /legal-documents/:id
GET   /legal-documents/current?type=&lang=&country=
POST  /legal-documents/:id/publish

POST/GET/PATCH  /law-registry, /law-registry/:id
GET   /law-registry/code/:code
GET   /law-registry/country/:code

POST/GET/PATCH  /dsr-requests, /dsr-requests/:id
POST  /dsr-requests/:id/complete
GET   /dsr-requests/pending
```

## gRPC Server (:50053)

| Method             | Description             |
| ------------------ | ----------------------- |
| CheckConsents      | Check required consents |
| GetAccountConsents | Get all user consents   |
| GrantConsent       | Grant new consent       |
| RevokeConsent      | Withdraw consent        |
| GetCurrentDocument | Get current legal doc   |
| GetLawRequirements | Get country law reqs    |
| CreateDsrRequest   | Create GDPR/PIPA DSR    |
| GetDsrRequest      | Get DSR by ID           |

**Proto**: `packages/proto/legal/v1/legal.proto`

## Database Tables

| Table            | Purpose           |
| ---------------- | ----------------- |
| legal_documents  | Legal documents   |
| consents         | User consents     |
| consent_logs     | Consent audit     |
| law_registry     | Law/regulation DB |
| dsr_requests     | GDPR DSR requests |
| dsr_request_logs | DSR audit log     |

## Events

```typescript
'CONSENT_GRANTED' | 'CONSENT_WITHDRAWN' | 'CONSENT_EXPIRED';
'DOCUMENT_CREATED' | 'DOCUMENT_PUBLISHED';
'DSR_REQUEST_SUBMITTED' | 'DSR_REQUEST_COMPLETED';
```

## Caching

| Key Pattern                  | TTL  |
| ---------------------------- | ---- |
| `consent:account:{id}`       | 5min |
| `consent:required:{country}` | 1h   |
| `document:current:{type}`    | 1h   |
| `law:code:{code}`            | 1h   |

## Environment

```bash
PORT=3005
GRPC_PORT=50053
DATABASE_URL=postgresql://...legal_db
VALKEY_HOST=localhost
JWT_SECRET=...
API_KEYS=key1,key2
```

---

**Full docs**: `docs/en/services/LEGAL_SERVICE.md`
