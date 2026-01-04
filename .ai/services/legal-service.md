# Legal Service

> Consent management, legal documents, law registry, DSR handling

## Service Info

| Property | Value                     |
| -------- | ------------------------- |
| REST     | :3005                     |
| gRPC     | :50053                    |
| Database | legal_db (PostgreSQL)     |
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

### Consents

```
POST/GET/DELETE  /consents, /consents/:id
POST             /consents/bulk
GET              /consents/account/:accountId
POST             /consents/check
```

### Legal Documents

```
POST/GET/PATCH   /legal-documents, /legal-documents/:id
GET              /legal-documents/current?type=&lang=&country=
POST             /legal-documents/:id/publish
```

### Law Registry

```
POST/GET/PATCH   /law-registry, /law-registry/:id
GET              /law-registry/code/:code
GET              /law-registry/country/:code
POST             /law-registry/seed
```

### DSR Requests

```
POST/GET/PATCH   /dsr-requests, /dsr-requests/:id
POST             /dsr-requests/:id/complete
GET              /dsr-requests/pending
```

## gRPC Server (:50053)

| Method               | Description             |
| -------------------- | ----------------------- |
| CheckConsents        | Check required consents |
| GetAccountConsents   | Get all user consents   |
| GrantConsent         | Grant new consent       |
| RevokeConsent        | Withdraw consent        |
| GetCurrentDocument   | Get current legal doc   |
| GetDocumentVersion   | Get specific version    |
| ListDocuments        | List documents          |
| GetLawRequirements   | Get country law reqs    |
| GetCountryCompliance | Get compliance info     |
| CreateDsrRequest     | Create GDPR/PIPA DSR    |
| GetDsrRequest        | Get DSR by ID           |
| GetDsrDeadline       | Get DSR deadline info   |

**Proto**: `packages/proto/legal/v1/legal.proto`

```typescript
import { LegalGrpcClient } from '@my-girok/nest-common';

const { all_required_granted } = await this.legalClient.checkConsents({
  account_id: accountId,
  country_code: 'KR',
  required_types: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
});
```

## Database Tables

| Table            | Purpose           |
| ---------------- | ----------------- |
| legal_documents  | Legal documents   |
| consents         | User consents     |
| consent_logs     | Consent audit     |
| law_registry     | Law/regulation DB |
| dsr_requests     | GDPR DSR requests |
| dsr_request_logs | DSR audit log     |

## Consent Types

```typescript
// Required
'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'AGE_VERIFICATION';

// Optional
'MARKETING_EMAIL' | 'MARKETING_PUSH' | 'MARKETING_PUSH_NIGHT';
'DATA_ANALYTICS' | 'THIRD_PARTY_SHARING' | 'CROSS_BORDER_TRANSFER';
```

## Global Law Coverage

| Code | Country | DSR Deadline | Min Age |
| ---- | ------- | ------------ | ------- |
| PIPA | KR      | 30 days      | 14      |
| GDPR | EU      | 30 days      | 16      |
| CCPA | US      | 45 days      | 13      |
| APPI | JP      | 30 days      | -       |

## DSR Request Types

| Type          | GDPR Article |
| ------------- | ------------ |
| ACCESS        | Art. 15      |
| RECTIFICATION | Art. 16      |
| ERASURE       | Art. 17      |
| PORTABILITY   | Art. 20      |
| RESTRICTION   | Art. 18      |
| OBJECTION     | Art. 21      |

## Event Types

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
| `law:country:{country}`      | 1h   |

## Environment

```bash
PORT=3005
DATABASE_URL=postgresql://...legal_db
REDIS_HOST=localhost
JWT_SECRET=...
API_KEYS=key1,key2
```

---

**Full docs**: `docs/services/LEGAL_SERVICE.md`
