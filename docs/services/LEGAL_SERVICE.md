# Legal Service

> Consent management, legal documents, law registry, and DSR handling

## Overview

The Legal Service manages legal compliance, user consents, and data subject requests for the my-girok Identity Platform.

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3005                       |
| gRPC Port | 50053                      |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | legal_db (PostgreSQL 16)   |

> **Note**: This service handles ONLY legal/compliance. Authentication is handled by `identity-service`, authorization by `auth-service`.

## Domain Boundaries

### What Belongs Here

- Consents (user consents, consent logs)
- Legal Documents (ToS, Privacy Policy, versions)
- Law Registry (country-specific requirements)
- DSR Requests (GDPR/PIPA/CCPA data subject requests)

### What Does NOT Belong Here

| Domain               | Correct Service  |
| -------------------- | ---------------- |
| Accounts, Sessions   | identity-service |
| Roles, Permissions   | auth-service     |
| Operators, Sanctions | auth-service     |

## API Reference

> See `.ai/services/legal-service.md` for quick endpoint list.

### Consents API

| Method | Endpoint                          | Auth | Description             |
| ------ | --------------------------------- | ---- | ----------------------- |
| POST   | `/v1/consents`                    | Yes  | Grant consent           |
| POST   | `/v1/consents/bulk`               | Yes  | Grant multiple          |
| DELETE | `/v1/consents/:id`                | Yes  | Withdraw consent        |
| GET    | `/v1/consents/:id`                | Yes  | Get consent             |
| GET    | `/v1/consents/account/:accountId` | Yes  | Get account consents    |
| GET    | `/v1/consents`                    | Yes  | List consents           |
| POST   | `/v1/consents/check`              | API  | Check required consents |

### Legal Documents API

| Method | Endpoint                          | Auth  | Description         |
| ------ | --------------------------------- | ----- | ------------------- |
| POST   | `/v1/legal-documents`             | Admin | Create document     |
| GET    | `/v1/legal-documents/:id`         | No    | Get document        |
| GET    | `/v1/legal-documents/current`     | No    | Get current version |
| GET    | `/v1/legal-documents`             | No    | List documents      |
| PATCH  | `/v1/legal-documents/:id`         | Admin | Update document     |
| POST   | `/v1/legal-documents/:id/publish` | Admin | Publish new version |

**Query Parameters for `/legal-documents/current`:**

- `type` - TERMS_OF_SERVICE, PRIVACY_POLICY, etc.
- `languageCode` - en, ko, ja, etc.
- `countryCode` - KR, US, JP, etc.

### Law Registry API

| Method | Endpoint                         | Auth  | Description    |
| ------ | -------------------------------- | ----- | -------------- |
| POST   | `/v1/law-registry`               | Admin | Create law     |
| GET    | `/v1/law-registry/:id`           | No    | Get law        |
| GET    | `/v1/law-registry/code/:code`    | No    | Get by code    |
| GET    | `/v1/law-registry/country/:code` | No    | Get by country |
| GET    | `/v1/law-registry`               | No    | List laws      |
| PATCH  | `/v1/law-registry/:id`           | Admin | Update law     |
| POST   | `/v1/law-registry/seed`          | Admin | Seed defaults  |

### DSR Requests API

| Method | Endpoint                        | Auth  | Description      |
| ------ | ------------------------------- | ----- | ---------------- |
| POST   | `/v1/dsr-requests`              | Yes   | Create request   |
| GET    | `/v1/dsr-requests/:id`          | Yes   | Get request      |
| PATCH  | `/v1/dsr-requests/:id`          | Admin | Update request   |
| POST   | `/v1/dsr-requests/:id/complete` | Admin | Complete request |
| GET    | `/v1/dsr-requests`              | Admin | List requests    |
| GET    | `/v1/dsr-requests/pending`      | Admin | List pending     |

## Database Schema

```sql
-- Legal Documents
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    language_code VARCHAR(10) DEFAULT 'en',
    country_code CHAR(2),
    status VARCHAR(20) DEFAULT 'DRAFT',
    effective_at TIMESTAMPTZ(6),
    published_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(type, version, language_code, country_code)
);

-- Consents
CREATE TABLE consents (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,  -- NO cross-DB FK
    consent_type VARCHAR(50) NOT NULL,
    document_id UUID REFERENCES legal_documents(id),
    document_version VARCHAR(20),
    scope VARCHAR(20) DEFAULT 'SERVICE',
    agreed_at TIMESTAMPTZ(6) DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ(6),
    expires_at TIMESTAMPTZ(6),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Law Registry
CREATE TABLE law_registry (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,  -- GDPR, PIPA, CCPA
    name VARCHAR(200) NOT NULL,
    country_code CHAR(2) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL,
    dsr_deadline_days INT DEFAULT 30,
    age_requirement INT,
    effective_at TIMESTAMPTZ(6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
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
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
```

## Consent Types

### Required Consents

| Type               | Description              | Always Required |
| ------------------ | ------------------------ | --------------- |
| `TERMS_OF_SERVICE` | General terms of service | Yes             |
| `PRIVACY_POLICY`   | Privacy policy           | Yes             |
| `AGE_VERIFICATION` | Age verification         | Country-based   |

### Optional Consents

| Type                    | Description           | Notes      |
| ----------------------- | --------------------- | ---------- |
| `MARKETING_EMAIL`       | Email marketing       |            |
| `MARKETING_PUSH`        | Push notifications    |            |
| `MARKETING_PUSH_NIGHT`  | Night-time push       | Korea PIPA |
| `DATA_ANALYTICS`        | Analytics collection  |            |
| `THIRD_PARTY_SHARING`   | Third-party sharing   |            |
| `CROSS_BORDER_TRANSFER` | Cross-border transfer | Japan APPI |

## Global Law Coverage

| Code | Country | Key Requirements                      | DSR Deadline | Min Age |
| ---- | ------- | ------------------------------------- | ------------ | ------- |
| PIPA | KR      | Night push consent, data localization | 30 days      | 14      |
| GDPR | EU      | Data portability, right to erasure    | 30 days      | 16      |
| CCPA | US      | Opt-out right, do not sell            | 45 days      | 13      |
| APPI | JP      | Cross-border transfer notice          | 30 days      | -       |

## DSR (Data Subject Request)

### Types

| Type            | Description                   | GDPR Article |
| --------------- | ----------------------------- | ------------ |
| `ACCESS`        | Right to access personal data | Art. 15      |
| `RECTIFICATION` | Right to correct data         | Art. 16      |
| `ERASURE`       | Right to be forgotten         | Art. 17      |
| `PORTABILITY`   | Right to data portability     | Art. 20      |
| `RESTRICTION`   | Right to restrict processing  | Art. 18      |
| `OBJECTION`     | Right to object to processing | Art. 21      |

### Workflow

```
1. Request Submitted
   └── Verify identity → Create request → Calculate deadline

2. Processing
   └── Gather data → Validate scope → Prepare response
   └── Status: PENDING → VERIFIED → IN_PROGRESS

3. Completion
   └── Send response → Archive → Publish event
   └── Status: COMPLETED / REJECTED
```

## gRPC Server

> See `.ai/services/legal-service.md` for method list.

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

## Development

```bash
# Start service
pnpm --filter @my-girok/legal-service dev

# Run tests
pnpm --filter @my-girok/legal-service test

# Run migrations
goose -dir migrations/legal postgres "$DATABASE_URL" up
```

## Related Documentation

- [Identity Service](./IDENTITY_SERVICE.md)
- [Auth Service](./AUTH_SERVICE.md)
- [Legal Consent Policy](../policies/LEGAL_CONSENT.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
