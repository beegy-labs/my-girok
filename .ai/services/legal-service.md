# Legal Service

> Consent management, legal documents, law registry, DSR handling

## Purpose

Legal compliance platform for the Identity Platform:

- **Consent Management**: GDPR, PIPA, CCPA consent collection and tracking
- **Legal Documents**: Terms of Service, Privacy Policy versioning
- **Law Registry**: Country-specific legal requirements
- **DSR Handling**: Data Subject Requests (access, deletion, portability)

---

## Architecture

```
legal-service (Port 3005)
├── consents/           # User consent records
├── legal-documents/    # ToS, Privacy Policy
├── law-registry/       # Country-specific laws
└── dsr-requests/       # GDPR/PIPA/CCPA DSR
        │
        ▼
    legal_db (PostgreSQL)
```

**Inter-Service Communication**:

- `identity-service`: Account validation (gRPC)
- `auth-service`: Operator permissions (gRPC)
- Events: `legal.*` topics (Redpanda)

---

## Database Schema (legal_db)

| Table              | Purpose           | Key Fields                                       |
| ------------------ | ----------------- | ------------------------------------------------ |
| `legal_documents`  | Legal documents   | id, type, version, content, effectiveAt          |
| `consents`         | User consents     | id, accountId, consentType, documentId, agreedAt |
| `consent_logs`     | Consent audit log | id, consentId, action, ipAddress, userAgent      |
| `law_registry`     | Law/regulation DB | id, code, countryCode, name, requirements        |
| `dsr_requests`     | GDPR DSR          | id, accountId, requestType, status, deadline     |
| `dsr_request_logs` | DSR audit log     | id, requestId, action, processedAt               |
| `outbox_events`    | Event outbox      | id, eventType, payload, status                   |

---

## API Endpoints

### Consents

```
POST   /consents                  # Grant consent
POST   /consents/bulk             # Grant bulk consents
DELETE /consents/:id              # Withdraw consent
GET    /consents/:id              # Get consent by ID
GET    /consents/account/:accountId # Get account consents
GET    /consents                  # List consents (paginated)
POST   /consents/check            # Check required consents
```

### Legal Documents

```
POST   /legal-documents           # Create document
GET    /legal-documents/:id       # Get document by ID
GET    /legal-documents/current   # Get current version by type
GET    /legal-documents           # List documents (paginated)
PATCH  /legal-documents/:id       # Update document
POST   /legal-documents/:id/publish # Publish new version
```

### Law Registry

```
POST   /law-registry              # Create law entry
GET    /law-registry/:id          # Get law by ID
GET    /law-registry/code/:code   # Get law by code (e.g., GDPR, PIPA)
GET    /law-registry/country/:code # Get laws by country
GET    /law-registry              # List laws (paginated)
PATCH  /law-registry/:id          # Update law
```

### DSR Requests

```
POST   /dsr-requests              # Create DSR request
GET    /dsr-requests/:id          # Get request by ID
PATCH  /dsr-requests/:id          # Update request status
POST   /dsr-requests/:id/complete # Complete request
GET    /dsr-requests              # List requests (paginated)
GET    /dsr-requests/pending      # List pending requests
```

---

## Event Types

```typescript
// Consent Events
'CONSENT_GRANTED';
'CONSENT_WITHDRAWN';
'CONSENT_EXPIRED';
'BULK_CONSENTS_GRANTED';

// Document Events
'DOCUMENT_CREATED';
'DOCUMENT_UPDATED';
'DOCUMENT_PUBLISHED';

// DSR Events
'DSR_REQUEST_SUBMITTED';
'DSR_REQUEST_PROCESSING';
'DSR_REQUEST_COMPLETED';
'DSR_REQUEST_REJECTED';
```

---

## Code Structure

```
services/legal-service/
├── prisma/
│   └── schema.prisma           # legal_db schema
├── migrations/
│   └── legal/                  # goose migrations
└── src/
    ├── database/
    │   └── prisma.service.ts   # Prisma client + UUIDv7
    ├── common/
    │   ├── cache/              # CacheService
    │   ├── guards/             # JWT, API key guards
    │   └── utils/              # Masking, validation
    ├── consents/
    │   ├── consents.module.ts
    │   ├── consents.controller.ts
    │   ├── consents.service.ts
    │   └── dto/
    ├── legal-documents/
    │   ├── legal-documents.module.ts
    │   ├── legal-documents.controller.ts
    │   ├── legal-documents.service.ts
    │   └── dto/
    ├── law-registry/
    │   ├── law-registry.module.ts
    │   ├── law-registry.controller.ts
    │   ├── law-registry.service.ts
    │   └── dto/
    └── dsr-requests/
        ├── dsr-requests.module.ts
        ├── dsr-requests.controller.ts
        ├── dsr-requests.service.ts
        └── dto/
```

---

## Environment Variables

```env
PORT=3005
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...legal_db

# Cache (Valkey/Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=...

# API Keys (service-to-service)
API_KEYS=key1,key2
```

---

## Global Law Coverage

| Code | Country | Key Requirements             | DSR Deadline |
| ---- | ------- | ---------------------------- | ------------ |
| PIPA | KR      | Age 14+, night push consent  | 30 days      |
| GDPR | EU      | Age 16+, data portability    | 30 days      |
| CCPA | US      | Age 13+, opt-out right       | 45 days      |
| APPI | JP      | Cross-border transfer notice | 30 days      |

---

## Consent Types

```typescript
// Required Consents (must accept to use service)
'TERMS_OF_SERVICE'; // General terms
'PRIVACY_POLICY'; // Privacy policy
'AGE_VERIFICATION'; // Age check (country-specific)

// Optional Consents
'MARKETING_EMAIL'; // Email marketing
'MARKETING_PUSH'; // Push notifications
'DATA_ANALYTICS'; // Analytics collection
'THIRD_PARTY_SHARING'; // Third-party data sharing
'NIGHT_PUSH'; // Night-time push (PIPA)
```

---

## DSR Request Types

| Type            | Description                   | GDPR Article |
| --------------- | ----------------------------- | ------------ |
| `ACCESS`        | Right to access personal data | Art. 15      |
| `RECTIFICATION` | Right to correct data         | Art. 16      |
| `ERASURE`       | Right to be forgotten         | Art. 17      |
| `PORTABILITY`   | Right to data portability     | Art. 20      |
| `RESTRICTION`   | Right to restrict processing  | Art. 18      |
| `OBJECT`        | Right to object to processing | Art. 21      |

---

## DSR Workflow

```
1. Request Submitted
   └── Verify identity → Create request → Set deadline

2. Processing
   └── Gather data → Validate scope → Prepare response

3. Completion
   └── Send response → Archive request → Publish event
```

---

## Caching Strategy

| Cache Key Pattern            | TTL    | Purpose                      |
| ---------------------------- | ------ | ---------------------------- |
| `consent:account:{id}`       | 5 min  | Account consents             |
| `consent:required:{country}` | 1 hour | Required consents by country |
| `document:current:{type}`    | 1 hour | Current document version     |
| `law:code:{code}`            | 1 hour | Law by code                  |
| `law:country:{country}`      | 1 hour | Laws by country              |

---

## Security

### Audit Trail

All consent and DSR operations are logged with:

- IP address (masked in logs)
- User agent
- Timestamp
- Actor ID
- Action type

### Guards

| Guard          | Purpose             | Header          |
| -------------- | ------------------- | --------------- |
| `JwtAuthGuard` | User authentication | `Authorization` |
| `ApiKeyGuard`  | Service-to-service  | `X-API-Key`     |

---

## 2025 Best Practices

| Standard             | Status | Implementation                    |
| -------------------- | ------ | --------------------------------- |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()`       |
| Transactional Outbox | ✅     | Atomic with business operations   |
| Consent Audit        | ✅     | Full audit trail for all consents |
| DSR Compliance       | ✅     | GDPR/PIPA/CCPA deadline tracking  |
| PII Masking          | ✅     | All PII masked in logs            |

---

## Type Definitions

> SSOT: `packages/types/src/legal/`

| File            | Contents                                |
| --------------- | --------------------------------------- |
| `types.ts`      | Consent, LegalDocument, DSRRequest DTOs |
| `interfaces.ts` | IConsentService, IDSRService, etc.      |
| `enums.ts`      | ConsentType, DSRRequestType, etc.       |

---

## Related Services

- **identity-service**: Accounts, sessions → `.ai/services/identity-service.md`
- **auth-service**: RBAC, operators → `.ai/services/auth-service.md`

---

**Full policy**: `docs/policies/IDENTITY_PLATFORM.md`
