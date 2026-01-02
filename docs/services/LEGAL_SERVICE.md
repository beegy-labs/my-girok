# Legal Service

> Consent management, legal documents, law registry, and DSR handling (Phase 3)

## Overview

The Legal Service manages legal compliance, user consents, and data subject requests for the my-girok Identity Platform. It is one of three separated services in the Phase 3 architecture.

> **WARNING**: This service handles ONLY legal/compliance features. Authentication is handled by `identity-service`, authorization by `auth-service`.

## Quick Reference

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3005                       |
| gRPC Port | 50053                      |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | legal_db (PostgreSQL 16)   |
| Codebase  | `services/legal-service/`  |

---

## Domain Boundaries

### What Belongs HERE (legal-service)

| Domain       | Tables/Entities                        |
| ------------ | -------------------------------------- |
| Consents     | `consents`, `consent_logs`             |
| Documents    | `legal_documents`, `document_versions` |
| Law Registry | `law_registry`, `law_requirements`     |
| DSR Requests | `dsr_requests`, `dsr_request_logs`     |

### What Does NOT Belong Here

| Domain               | Correct Service  |
| -------------------- | ---------------- |
| Accounts, Sessions   | identity-service |
| Devices, Profiles    | identity-service |
| Roles, Permissions   | auth-service     |
| Operators, Sanctions | auth-service     |

---

## API Endpoints

### Consents

| Method | Endpoint                          | Auth | Description             |
| ------ | --------------------------------- | ---- | ----------------------- |
| POST   | `/v1/consents`                    | Yes  | Grant consent           |
| POST   | `/v1/consents/bulk`               | Yes  | Grant multiple consents |
| DELETE | `/v1/consents/:id`                | Yes  | Withdraw consent        |
| GET    | `/v1/consents/:id`                | Yes  | Get consent by ID       |
| GET    | `/v1/consents/account/:accountId` | Yes  | Get account consents    |
| GET    | `/v1/consents`                    | Yes  | List consents           |
| POST   | `/v1/consents/check`              | API  | Check required consents |

### Legal Documents

| Method | Endpoint                          | Auth  | Description         |
| ------ | --------------------------------- | ----- | ------------------- |
| POST   | `/v1/legal-documents`             | Admin | Create document     |
| GET    | `/v1/legal-documents/:id`         | No    | Get document by ID  |
| GET    | `/v1/legal-documents/current`     | No    | Get current version |
| GET    | `/v1/legal-documents`             | No    | List documents      |
| PATCH  | `/v1/legal-documents/:id`         | Admin | Update document     |
| POST   | `/v1/legal-documents/:id/publish` | Admin | Publish new version |

**Query Parameters for `/legal-documents/current`:**

- `type` - Document type (TERMS_OF_SERVICE, PRIVACY_POLICY, etc.)
- `languageCode` - Language code (en, ko, ja, etc.)
- `countryCode` - Country code (KR, US, JP, etc.)

### Law Registry

| Method | Endpoint                         | Auth  | Description         |
| ------ | -------------------------------- | ----- | ------------------- |
| POST   | `/v1/law-registry`               | Admin | Create law entry    |
| GET    | `/v1/law-registry/:id`           | No    | Get law by ID       |
| GET    | `/v1/law-registry/code/:code`    | No    | Get law by code     |
| GET    | `/v1/law-registry/country/:code` | No    | Get laws by country |
| GET    | `/v1/law-registry`               | No    | List laws           |
| PATCH  | `/v1/law-registry/:id`           | Admin | Update law          |
| POST   | `/v1/law-registry/seed`          | Admin | Seed default laws   |

### DSR Requests (Data Subject Requests)

| Method | Endpoint                        | Auth  | Description        |
| ------ | ------------------------------- | ----- | ------------------ |
| POST   | `/v1/dsr-requests`              | Yes   | Create DSR request |
| GET    | `/v1/dsr-requests/:id`          | Yes   | Get request by ID  |
| PATCH  | `/v1/dsr-requests/:id`          | Admin | Update request     |
| POST   | `/v1/dsr-requests/:id/complete` | Admin | Complete request   |
| GET    | `/v1/dsr-requests`              | Admin | List requests      |
| GET    | `/v1/dsr-requests/pending`      | Admin | List pending       |

---

## gRPC Server (Port 50053)

The legal-service exposes a gRPC server for consent and compliance checks from other services.

### Proto Definition

```protobuf
// packages/proto/legal/v1/legal.proto
service LegalService {
  // Consent Operations
  rpc CheckConsents(CheckConsentsRequest) returns (CheckConsentsResponse);
  rpc GetAccountConsents(GetAccountConsentsRequest) returns (GetAccountConsentsResponse);
  rpc GrantConsent(GrantConsentRequest) returns (GrantConsentResponse);
  rpc RevokeConsent(RevokeConsentRequest) returns (RevokeConsentResponse);

  // Document Operations
  rpc GetCurrentDocument(GetCurrentDocumentRequest) returns (GetCurrentDocumentResponse);
  rpc GetDocumentVersion(GetDocumentVersionRequest) returns (GetDocumentVersionResponse);
  rpc ListDocuments(ListDocumentsRequest) returns (ListDocumentsResponse);

  // Law Registry Operations
  rpc GetLawRequirements(GetLawRequirementsRequest) returns (GetLawRequirementsResponse);
  rpc GetCountryCompliance(GetCountryComplianceRequest) returns (GetCountryComplianceResponse);

  // DSR Operations
  rpc CreateDsrRequest(CreateDsrRequestRequest) returns (CreateDsrRequestResponse);
  rpc GetDsrRequest(GetDsrRequestRequest) returns (GetDsrRequestResponse);
  rpc GetDsrDeadline(GetDsrDeadlineRequest) returns (GetDsrDeadlineResponse);
}
```

### Client Usage (from other services)

```typescript
import { GrpcClientsModule, LegalGrpcClient } from '@my-girok/nest-common';

@Module({
  imports: [GrpcClientsModule.forRoot({ legal: true })],
})
export class AppModule {}

@Injectable()
export class IdentityService {
  constructor(private readonly legalClient: LegalGrpcClient) {}

  async checkRequiredConsents(accountId: string, countryCode: string) {
    const { all_required_granted, missing } = await this.legalClient.checkConsents({
      account_id: accountId,
      country_code: countryCode,
      required_types: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    });
    return { allGranted: all_required_granted, missing };
  }
}
```

### Convenience Methods

```typescript
// Check specific consents
await legalClient.hasAcceptedTerms(accountId, countryCode); // Returns boolean
await legalClient.hasAcceptedPrivacyPolicy(accountId, countryCode);

// Get documents
await legalClient.getTermsOfService(languageCode, countryCode);
await legalClient.getPrivacyPolicy(languageCode, countryCode);

// Submit DSR requests (GDPR)
await legalClient.submitErasureRequest(accountId, reason); // Art. 17
await legalClient.submitAccessRequest(accountId, reason); // Art. 15
await legalClient.submitPortabilityRequest(accountId, reason); // Art. 20
```

---

## Database Schema (legal_db)

### Core Tables

```sql
-- Legal Documents
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',
    country_code CHAR(2),
    status VARCHAR(20) DEFAULT 'DRAFT',
    effective_at TIMESTAMPTZ(6),
    published_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(type, version, language_code, country_code)
);

-- Consents
CREATE TABLE consents (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,  -- References identity_db.accounts (NO FK)
    consent_type VARCHAR(50) NOT NULL,
    document_id UUID REFERENCES legal_documents(id),
    document_version VARCHAR(20),
    scope VARCHAR(20) DEFAULT 'SERVICE',
    agreed_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ(6),
    expires_at TIMESTAMPTZ(6),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Consent Audit Logs
CREATE TABLE consent_logs (
    id UUID PRIMARY KEY,
    consent_id UUID NOT NULL REFERENCES consents(id),
    action VARCHAR(20) NOT NULL,  -- GRANTED, WITHDRAWN, EXPIRED, MIGRATED
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Law Registry
CREATE TABLE law_registry (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,  -- GDPR, PIPA, CCPA, APPI
    name VARCHAR(200) NOT NULL,
    country_code CHAR(2) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL,
    dsr_deadline_days INT DEFAULT 30,
    age_requirement INT,
    effective_at TIMESTAMPTZ(6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- DSR Requests
CREATE TABLE dsr_requests (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    reason TEXT,
    law_code VARCHAR(20),
    deadline_at TIMESTAMPTZ(6),
    completed_at TIMESTAMPTZ(6),
    response_type VARCHAR(50),
    response_data JSONB,
    assigned_to UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- DSR Request Logs
CREATE TABLE dsr_request_logs (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES dsr_requests(id),
    action VARCHAR(50) NOT NULL,
    actor_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
```

---

## Consent Types

### Required Consents

| Type               | Description              | Always Required |
| ------------------ | ------------------------ | --------------- |
| `TERMS_OF_SERVICE` | General terms of service | Yes             |
| `PRIVACY_POLICY`   | Privacy policy           | Yes             |
| `AGE_VERIFICATION` | Age verification         | Country-based   |

### Optional Consents

| Type                    | Description                   | Notes           |
| ----------------------- | ----------------------------- | --------------- |
| `MARKETING_EMAIL`       | Email marketing               |                 |
| `MARKETING_PUSH`        | Push notifications            |                 |
| `MARKETING_PUSH_NIGHT`  | Night-time push (20:00-08:00) | Korea PIPA      |
| `MARKETING_SMS`         | SMS marketing                 |                 |
| `DATA_ANALYTICS`        | Analytics data collection     |                 |
| `THIRD_PARTY_SHARING`   | Third-party data sharing      |                 |
| `CROSS_BORDER_TRANSFER` | Cross-border data transfer    | APPI (Japan)    |
| `CROSS_SERVICE_SHARING` | Cross-service data sharing    | Unified Account |
| `PERSONALIZED_ADS`      | Personalized advertising      |                 |

---

## Global Law Coverage

| Code | Country | Key Requirements                        | DSR Deadline | Min Age |
| ---- | ------- | --------------------------------------- | ------------ | ------- |
| PIPA | KR      | Night push consent, data localization   | 30 days      | 14      |
| GDPR | EU      | Data portability, right to be forgotten | 30 days      | 16      |
| CCPA | US      | Opt-out right, do not sell              | 45 days      | 13      |
| APPI | JP      | Cross-border transfer notice            | 30 days      | -       |

---

## DSR (Data Subject Request) Types

| Type            | Description                   | GDPR Article |
| --------------- | ----------------------------- | ------------ |
| `ACCESS`        | Right to access personal data | Art. 15      |
| `RECTIFICATION` | Right to correct data         | Art. 16      |
| `ERASURE`       | Right to be forgotten         | Art. 17      |
| `PORTABILITY`   | Right to data portability     | Art. 20      |
| `RESTRICTION`   | Right to restrict processing  | Art. 18      |
| `OBJECTION`     | Right to object to processing | Art. 21      |

### DSR Workflow

```
1. Request Submitted
   └── Verify identity → Create request → Calculate deadline

2. Processing
   └── Gather data → Validate scope → Prepare response
   └── Status: PENDING → VERIFIED → IN_PROGRESS

3. Completion
   └── Send response → Archive request → Publish event
   └── Status: COMPLETED / REJECTED
```

### DSR Status Flow

```
PENDING → VERIFIED → IN_PROGRESS → COMPLETED
    │         │           │
    │         │           └──► AWAITING_INFO
    │         │
    └─► REJECTED (invalid request)
    └─► CANCELLED (user cancelled)
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
'DSR_REQUEST_VERIFIED';
'DSR_REQUEST_PROCESSING';
'DSR_REQUEST_COMPLETED';
'DSR_REQUEST_REJECTED';
'DSR_DEADLINE_WARNING'; // 7 days before deadline
'DSR_DEADLINE_CRITICAL'; // 3 days before deadline
'DSR_DEADLINE_OVERDUE'; // Past deadline
```

---

## Environment Variables

```env
PORT=3005
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/legal_db

# Cache (Valkey/Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=...

# API Keys (service-to-service)
API_KEYS=key1,key2

# gRPC
LEGAL_GRPC_PORT=50053
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

## Security & Audit

### Audit Trail

All consent and DSR operations are logged with:

- IP address (masked in application logs, stored in DB)
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

## Development

```bash
# Start service
pnpm --filter @my-girok/legal-service dev

# Run tests
pnpm --filter @my-girok/legal-service test

# Generate Prisma client
pnpm --filter @my-girok/legal-service prisma:generate

# Run migrations
goose -dir migrations/legal postgres "$DATABASE_URL" up
```

---

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [Legal Consent Policy](../policies/LEGAL_CONSENT.md)
- [Legal Service LLM Reference](../../.ai/services/legal-service.md)
- [Identity Service](./IDENTITY_SERVICE.md)
- [Auth Service](./AUTH_SERVICE.md)
- [gRPC Guide](../guides/GRPC.md)
