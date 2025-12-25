# Auth Service

> Authentication & authorization microservice

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.9
- **Database**: PostgreSQL 16 + Prisma 6
- **Auth**: Passport.js + JWT
- **Port**: 3001

## API Endpoints

### Authentication

```
POST /v1/auth/register       # { email, password, name, consents[] }
POST /v1/auth/login          # { email, password }
POST /v1/auth/refresh        # { refreshToken }
POST /v1/auth/logout         # (auth required)
GET  /v1/auth/google         # OAuth redirect
GET  /v1/auth/google/callback
POST /v1/auth/domain-access  # Time-limited token
```

### Users

```
GET   /v1/users/me                    # Profile (auth)
PATCH /v1/users/me                    # Update (auth)
POST  /v1/users/me/change-password    # (auth)
GET   /v1/users/by-username/:username # Public profile
```

### Legal & Consent

```
GET  /v1/legal/consent-requirements   # Public
GET  /v1/legal/documents/:type        # Public
GET  /v1/legal/consents               # User consents (auth)
POST /v1/legal/consents               # Create (auth)
PUT  /v1/legal/consents/:type         # Update (auth)
```

### Admin (H-RBAC)

```
POST /v1/admin/auth/login|refresh|logout
GET  /v1/admin/auth/me

GET|POST        /v1/admin/tenants           # tenant:read|create
GET|PUT         /v1/admin/tenants/:id       # tenant:read|update
PATCH           /v1/admin/tenants/:id/status # tenant:approve

GET|POST|PUT|DELETE /v1/admin/legal/documents     # legal:*
GET             /v1/admin/legal/consents[/stats]  # legal:read

GET             /v1/admin/audit/logs[/export]     # audit:read
```

## Key Flows

### Registration

1. Validate DTO → Check email → Hash password (bcrypt 12)
2. Create user + consents in transaction
3. Return { user, accessToken, refreshToken }

### Login

1. Find user → Verify password → Generate tokens
2. Create session → Return tokens

## JWT Configuration

| Token   | Expiration | Storage         |
| ------- | ---------- | --------------- |
| Access  | 15 min     | localStorage    |
| Refresh | 14 days    | HttpOnly cookie |

## H-RBAC Hierarchy

```
SYSTEM LEVEL
├── system_super   (level 100) - Full access (*)
├── system_admin   (level 80)  - Partner/User/Legal
└── system_moderator (level 50) - Content moderation

TENANT LEVEL
├── partner_super  (level 100) - Full tenant
├── partner_admin  (level 80)  - Admin management
└── partner_editor (level 50)  - View only
```

### Permissions

```typescript
@Permissions('legal:read')    // resource:action
@Permissions('tenant:approve')
@Permissions('*')             // Wildcard
```

## Guards

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) { }

@UseGuards(AdminAuthGuard, PermissionGuard)
@Permissions('legal:create')
createDocument(@CurrentAdmin() admin: AdminPayload) { }
```

## Security

- Password: bcrypt 12 rounds
- Rate limiting: 5 req/min (login/register)
- Account lockout: 5 failed attempts (30 min)

---

**Detailed docs**: `docs/services/AUTH_SERVICE.md`
