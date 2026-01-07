# legal-service

```yaml
port: 3006
grpc: 50053
db: legal_db (PostgreSQL)
cache: Valkey DB 0
events: legal.* (Redpanda)
codebase: services/legal-service/
```

## Boundaries

| Owns            | Not                 |
| --------------- | ------------------- |
| Consents        | Accounts/Sessions   |
| Legal Documents | Roles/Permissions   |
| Law Registry    | Operators/Sanctions |
| DSR Requests    | Devices/Profiles    |

## REST

```
POST/GET/DELETE /consents[/:id]
POST /consents/bulk
GET /consents/account/:accountId
POST /consents/check

POST/GET/PATCH /legal-documents[/:id]
GET /legal-documents/current?type=&lang=&country=
POST /legal-documents/:id/publish

POST/GET/PATCH /law-registry[/:id]
GET /law-registry/code/:code
GET /law-registry/country/:code

POST/GET/PATCH /dsr-requests[/:id]
POST /dsr-requests/:id/complete
GET /dsr-requests/pending
```

## gRPC (50053)

| Method             | Desc           |
| ------------------ | -------------- |
| CheckConsents      | Check required |
| GetAccountConsents | All consents   |
| GrantConsent       | Grant          |
| RevokeConsent      | Withdraw       |
| GetCurrentDocument | Current doc    |
| GetLawRequirements | Country reqs   |
| CreateDsrRequest   | GDPR/PIPA DSR  |
| GetDsrRequest      | DSR by ID      |

Proto: `packages/proto/legal/v1/legal.proto`

## Tables

| Table            | Purpose        |
| ---------------- | -------------- |
| legal_documents  | Legal docs     |
| consents         | User consents  |
| consent_logs     | Consent audit  |
| law_registry     | Law/regulation |
| dsr_requests     | GDPR DSR       |
| dsr_request_logs | DSR audit      |

## Events

```
CONSENT_GRANTED|WITHDRAWN|EXPIRED
DOCUMENT_CREATED|PUBLISHED
DSR_REQUEST_SUBMITTED|COMPLETED
```

## Cache

| Key                          | TTL |
| ---------------------------- | --- |
| `consent:account:{id}`       | 5m  |
| `consent:required:{country}` | 1h  |
| `document:current:{type}`    | 1h  |
| `law:code:{code}`            | 1h  |

## Env

```bash
PORT=3006
GRPC_PORT=50053
DATABASE_URL=postgresql://...legal_db
VALKEY_HOST=localhost
JWT_SECRET=...
API_KEYS=key1,key2
```

---

Full: `docs/en/services/LEGAL_SERVICE.md`
