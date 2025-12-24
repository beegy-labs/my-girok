# Auth Service

> Authentication, sessions, and legal consent management

## Quick Reference

| Item      | Value                      |
| --------- | -------------------------- |
| Port      | 3001                       |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | PostgreSQL 16 + Prisma 6   |
| Auth      | Passport.js + JWT          |

## API Endpoints

### Authentication

| Method | Endpoint                   | Auth | Description         |
| ------ | -------------------------- | ---- | ------------------- |
| POST   | `/v1/auth/register`        | No   | Register new user   |
| POST   | `/v1/auth/login`           | No   | Login               |
| POST   | `/v1/auth/refresh`         | No   | Refresh token       |
| POST   | `/v1/auth/logout`          | Yes  | Logout              |
| GET    | `/v1/auth/google`          | No   | Google OAuth        |
| GET    | `/v1/auth/google/callback` | No   | OAuth callback      |
| POST   | `/v1/auth/domain-access`   | Yes  | Create domain token |

### Users

| Method | Endpoint                          | Auth | Description     |
| ------ | --------------------------------- | ---- | --------------- |
| GET    | `/v1/users/me`                    | Yes  | Get profile     |
| PATCH  | `/v1/users/me`                    | Yes  | Update profile  |
| POST   | `/v1/users/me/change-password`    | Yes  | Change password |
| GET    | `/v1/users/by-username/:username` | No   | Public profile  |

### Legal & Consent

| Method | Endpoint                         | Auth | Description       |
| ------ | -------------------------------- | ---- | ----------------- |
| GET    | `/v1/legal/consent-requirements` | No   | Get requirements  |
| GET    | `/v1/legal/documents/:type`      | No   | Get document      |
| GET    | `/v1/legal/consents`             | Yes  | Get user consents |
| POST   | `/v1/legal/consents`             | Yes  | Create consents   |
| PUT    | `/v1/legal/consents/:type`       | Yes  | Update consent    |

## JWT Configuration

| Token   | Expiration | Storage         |
| ------- | ---------- | --------------- |
| Access  | 15 minutes | localStorage    |
| Refresh | 14 days    | HttpOnly cookie |

## Consent Types

| Type                 | Required        |
| -------------------- | --------------- |
| TERMS_OF_SERVICE     | Yes             |
| PRIVACY_POLICY       | Yes             |
| MARKETING_EMAIL      | No              |
| MARKETING_PUSH       | No              |
| MARKETING_PUSH_NIGHT | No (Korea only) |
| MARKETING_SMS        | No              |

## Environment Variables

```bash
PORT=3001
DATABASE_URL=postgresql://user:pass@postgres:5432/auth_db
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=14d
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Development

```bash
pnpm --filter auth-service dev      # Start
pnpm --filter auth-service test     # Test
pnpm --filter auth-service prisma:generate  # Generate client
```

---

**LLM Reference**: [.ai/services/auth-service.md](../../.ai/services/auth-service.md)
