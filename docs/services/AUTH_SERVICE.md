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

### Admin Authentication

| Method | Endpoint                 | Permission | Description   |
| ------ | ------------------------ | ---------- | ------------- |
| POST   | `/v1/admin/auth/login`   | -          | Admin login   |
| POST   | `/v1/admin/auth/refresh` | -          | Refresh token |
| GET    | `/v1/admin/auth/me`      | -          | Admin profile |
| POST   | `/v1/admin/auth/logout`  | -          | Logout        |

### Admin Tenant Management

| Method | Endpoint                       | Permission       | Description   |
| ------ | ------------------------------ | ---------------- | ------------- |
| GET    | `/v1/admin/tenants`            | `tenant:read`    | List tenants  |
| GET    | `/v1/admin/tenants/:id`        | `tenant:read`    | Get tenant    |
| POST   | `/v1/admin/tenants`            | `tenant:create`  | Create tenant |
| PUT    | `/v1/admin/tenants/:id`        | `tenant:update`  | Update tenant |
| PATCH  | `/v1/admin/tenants/:id/status` | `tenant:approve` | Change status |

### Admin Legal Management

| Method | Endpoint                         | Permission     | Description        |
| ------ | -------------------------------- | -------------- | ------------------ |
| GET    | `/v1/admin/legal/documents`      | `legal:read`   | List documents     |
| GET    | `/v1/admin/legal/documents/:id`  | `legal:read`   | Get document       |
| POST   | `/v1/admin/legal/documents`      | `legal:create` | Create document    |
| PUT    | `/v1/admin/legal/documents/:id`  | `legal:update` | Update document    |
| DELETE | `/v1/admin/legal/documents/:id`  | `legal:delete` | Soft delete        |
| GET    | `/v1/admin/legal/consents`       | `legal:read`   | List consents      |
| GET    | `/v1/admin/legal/consents/stats` | `legal:read`   | Consent statistics |

### Admin Audit Logs

| Method | Endpoint                      | Permission   | Description     |
| ------ | ----------------------------- | ------------ | --------------- |
| GET    | `/v1/admin/audit/logs`        | `audit:read` | List audit logs |
| GET    | `/v1/admin/audit/filters`     | `audit:read` | Filter options  |
| GET    | `/v1/admin/audit/logs/export` | `audit:read` | Export as CSV   |

**Audit Log Query Parameters:**

- `action` - Filter by action type
- `resource` - Filter by resource
- `adminId` - Filter by admin ID
- `dateFrom`, `dateTo` - Date range filter
- `page`, `limit` - Pagination

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
