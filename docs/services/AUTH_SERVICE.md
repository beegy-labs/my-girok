# Auth Service Documentation

> Complete guide for the Authentication & Authorization microservice

## Overview

The Auth Service handles user authentication, session management, access control, and legal consent management for the My-Girok platform.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [API Endpoints](#api-endpoints)
3. [Authentication Flows](#authentication-flows)
4. [Database Schema](#database-schema)
5. [Security](#security)
6. [Legal & Consent API](#legal--consent-api)
7. [Environment Variables](#environment-variables)
8. [Development Guide](#development-guide)

---

## Tech Stack

| Component      | Technology                 |
| -------------- | -------------------------- |
| Framework      | NestJS 11 + TypeScript 5.9 |
| Database       | PostgreSQL 16 + Prisma 6   |
| Authentication | Passport.js + JWT          |
| Protocol       | REST (external)            |
| Port           | 3001                       |

### Future Plans

- **gRPC API** for internal BFF communication
- **Rust Migration** with Axum + Tonic

---

## API Endpoints

### Base URL

- **Development**: `http://localhost:3001`
- **Staging**: `https://my-api-dev.girok.dev/auth`
- **Production**: `https://my-api.girok.dev/auth`

### Authentication Endpoints

| Method | Endpoint                   | Auth | Description                |
| ------ | -------------------------- | ---- | -------------------------- |
| POST   | `/v1/auth/register`        | No   | Register new user          |
| POST   | `/v1/auth/login`           | No   | Login with email/password  |
| POST   | `/v1/auth/refresh`         | No   | Refresh access token       |
| POST   | `/v1/auth/logout`          | Yes  | Logout (invalidate tokens) |
| GET    | `/v1/auth/google`          | No   | Initiate Google OAuth      |
| GET    | `/v1/auth/google/callback` | No   | Google OAuth callback      |

### User Endpoints

| Method | Endpoint                          | Auth | Description              |
| ------ | --------------------------------- | ---- | ------------------------ |
| GET    | `/v1/users/me`                    | Yes  | Get current user profile |
| PATCH  | `/v1/users/me`                    | Yes  | Update user profile      |
| POST   | `/v1/users/me/change-password`    | Yes  | Change password          |
| GET    | `/v1/users/by-username/:username` | No   | Get public user profile  |

### Domain Access Endpoints

| Method | Endpoint                 | Auth | Description                      |
| ------ | ------------------------ | ---- | -------------------------------- |
| POST   | `/v1/auth/domain-access` | Yes  | Create time-limited access token |

### Legal & Consent Endpoints

| Method | Endpoint                         | Auth | Description              |
| ------ | -------------------------------- | ---- | ------------------------ |
| GET    | `/v1/legal/consent-requirements` | No   | Get consent requirements |
| GET    | `/v1/legal/documents/:type`      | No   | Get legal document       |
| GET    | `/v1/legal/documents/by-id/:id`  | No   | Get document by ID       |
| GET    | `/v1/legal/consents`             | Yes  | Get user's consents      |
| POST   | `/v1/legal/consents`             | Yes  | Create consents          |
| PUT    | `/v1/legal/consents/:type`       | Yes  | Update consent           |
| GET    | `/v1/legal/consents/check`       | Yes  | Check required consents  |

---

## Authentication Flows

### Registration Flow

```
1. Client → POST /v1/auth/register
   Body: { email, password, name, consents[] }

2. Server validates input (class-validator)
3. Check if email exists → 409 Conflict if exists
4. Hash password (bcrypt, 12 rounds)
5. Create user + consent records in transaction
6. Generate JWT tokens
   - Access: 15 minutes
   - Refresh: 14 days

7. Server → Client
   Response: { user, accessToken, refreshToken }
```

### Login Flow

```
1. Client → POST /v1/auth/login
   Body: { email, password }

2. Find user by email
3. Compare password hash (bcrypt)
4. If invalid → 401 Unauthorized
5. Generate JWT tokens
6. Create session record

7. Server → Client
   Response: { accessToken, refreshToken }
```

### Google OAuth Flow

```
1. Client redirects to GET /v1/auth/google
2. Service redirects to Google OAuth consent
3. User approves on Google
4. Google redirects to GET /v1/auth/google/callback
5. Service exchanges code for Google tokens
6. Fetch user profile from Google
7. Find or create user in DB
8. Generate JWT tokens
9. Redirect to client with tokens
```

### Token Refresh Flow

```
1. Client → POST /v1/auth/refresh
   Body: { refreshToken }

2. Verify refresh token (jwt.verify)
3. Check if token blacklisted
4. Generate new access token (15 minutes)
5. Optionally rotate refresh token

6. Server → Client
   Response: { accessToken, refreshToken? }
```

---

## Database Schema

### User Model

```prisma
model User {
  id            String       @id @default(uuid())
  externalId    String       @unique  // 10-char ID for partners
  email         String       @unique
  username      String       @unique  // Public profile URL
  password      String?      // null for OAuth users
  name          String?
  avatar        String?
  role          Role         @default(USER)
  provider      AuthProvider @default(LOCAL)
  providerId    String?      // OAuth provider user ID
  emailVerified Boolean      @default(false)
  region        String?      // KR, JP, EU, US
  locale        String?      // ko, en, ja
  timezone      String?      // Asia/Seoul

  sessions      Session[]
  domainAccess  DomainAccessToken[]
  consents      UserConsent[]
}
```

### Enums

| Enum                | Values                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `Role`              | GUEST, USER, MANAGER, MASTER                                            |
| `AuthProvider`      | LOCAL, GOOGLE, KAKAO, NAVER, APPLE                                      |
| `LegalDocumentType` | TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_POLICY, PERSONALIZED_ADS    |
| `ConsentType`       | TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_EMAIL, MARKETING_PUSH, etc. |

---

## Security

### Password Policy

- Minimum 8 characters
- Must include: uppercase, lowercase, number, special character
- Hashing: bcrypt with 12 rounds

### JWT Configuration

| Token Type | Expiration | Storage         |
| ---------- | ---------- | --------------- |
| Access     | 15 minutes | localStorage    |
| Refresh    | 14 days    | HttpOnly cookie |

### Rate Limiting

| Endpoint | Limit   | Window |
| -------- | ------- | ------ |
| Register | 5 req   | 1 min  |
| Login    | 5 req   | 1 min  |
| Global   | 100 req | 1 min  |

### Account Lockout

- After 5 failed login attempts
- Lockout duration: 30 minutes

---

## Legal & Consent API

### Consent Types

| Type                 | Required | Description              |
| -------------------- | -------- | ------------------------ |
| TERMS_OF_SERVICE     | Yes      | Terms of service         |
| PRIVACY_POLICY       | Yes      | Privacy policy           |
| MARKETING_EMAIL      | No       | Email marketing          |
| MARKETING_PUSH       | No       | Push notifications       |
| MARKETING_PUSH_NIGHT | No       | Night push (21:00-08:00) |
| MARKETING_SMS        | No       | SMS marketing            |
| PERSONALIZED_ADS     | No       | Personalized advertising |
| THIRD_PARTY_SHARING  | No       | Third-party data sharing |

### Region-Specific Compliance

| Region | Law  | Requirements                         |
| ------ | ---- | ------------------------------------ |
| KR     | PIPA | Night push restriction (21:00-08:00) |
| JP     | APPI | Strict personal data rules           |
| EU     | GDPR | Explicit consent required            |
| US     | CCPA | Opt-out rights                       |

---

## Environment Variables

```bash
# Server
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/auth_db

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=14d

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.girok.dev/auth/v1/auth/google/callback

# Kakao OAuth (optional)
KAKAO_CLIENT_ID=your-client-id
KAKAO_CLIENT_SECRET=your-client-secret

# Naver OAuth (optional)
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
```

---

## Development Guide

### Running Locally

```bash
# Start service
pnpm --filter auth-service dev

# Run tests
pnpm --filter auth-service test

# Generate Prisma client
pnpm --filter auth-service prisma:generate

# Run migrations
pnpm --filter auth-service prisma:migrate
```

### Adding New OAuth Provider

1. Add to `AuthProvider` enum in `packages/types`
2. Create strategy: `src/auth/strategies/[provider].strategy.ts`
3. Register in `auth.module.ts`
4. Add callback route in controller
5. Add OAuth credentials to `.env`

### Guards Usage

```typescript
// JWT Guard - protect routes
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

// Roles Guard - role-based access
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MASTER)
@Get('admin/users')
getAllUsers() {
  return this.usersService.findAll();
}
```

---

## Related Documentation

- **LLM Reference**: [.ai/services/auth-service.md](../../.ai/services/auth-service.md)
- **Legal Policy**: [docs/policies/LEGAL_CONSENT.md](../policies/LEGAL_CONSENT.md)
- **Security Policy**: [docs/policies/SECURITY.md](../policies/SECURITY.md)
- **Types Package**: [docs/packages/TYPES.md](../packages/TYPES.md)

---

_Last updated: 2025-12-24_
