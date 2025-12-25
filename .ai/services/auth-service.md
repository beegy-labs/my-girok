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

## Global Account System

### Account Mode

| Mode    | Description                               |
| ------- | ----------------------------------------- |
| SERVICE | Per-service independent account (default) |
| UNIFIED | Integrated account across services        |

### Service API

```
GET  /v1/services/:slug/consent-requirements  # Get required consents
POST /v1/services/:slug/join                  # Join service { countryCode, consents[] }
POST /v1/services/:slug/consent/:countryCode  # Add country consent
PUT  /v1/services/:slug/consent               # Update consent
DELETE /v1/services/:slug/withdraw            # Withdraw from service
```

### Account Linking

```
GET    /v1/users/me/linkable-accounts      # Find linkable accounts
POST   /v1/users/me/link-account           # Request link
POST   /v1/users/me/accept-link            # Accept with password
GET    /v1/users/me/linked-accounts        # List linked
DELETE /v1/users/me/linked-accounts/:id    # Unlink
```

### Operator API

```
# Admin manages operators
POST   /v1/admin/operators              # Create operator
POST   /v1/admin/operators/invite       # Invite (EMAIL/DIRECT)
GET    /v1/admin/operators              # List
PATCH  /v1/admin/operators/:id          # Update
DELETE /v1/admin/operators/:id          # Delete
POST   /v1/admin/operators/:id/permissions  # Grant permission

# Operator auth
POST   /v1/operator/auth/login          # { email, password, serviceSlug }
POST   /v1/operator/auth/refresh        # Refresh token
```

### Law Registry

```
GET    /v1/admin/laws                   # List laws (PIPA, GDPR, etc.)
GET    /v1/admin/laws/:code             # Get by code
POST   /v1/admin/laws                   # Create law
PATCH  /v1/admin/laws/:code             # Update
DELETE /v1/admin/laws/:code             # Delete (with ref check)
GET    /v1/admin/laws/:code/consent-requirements
POST   /v1/admin/laws/seed              # Seed defaults
```

### Personal Info API

```
# User
GET    /v1/users/me/personal-info       # Get my info
PATCH  /v1/users/me/personal-info       # Update
DELETE /v1/users/me/personal-info       # Delete

# Admin
GET    /v1/admin/users/:id/personal-info  # Get user's info
```

### Unified Guards

```typescript
// Token type routing
@UseGuards(UnifiedAuthGuard)

// Require specific account type
@UseGuards(UnifiedAuthGuard, AccountTypeGuard)
@RequireAccountType('USER')  // or 'ADMIN', 'OPERATOR'

// Service membership check
@UseGuards(UnifiedAuthGuard, ServiceAccessGuard)
@RequireService('resume')

// Country consent check
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
```

### Decorators

| Decorator                       | Description                           |
| ------------------------------- | ------------------------------------- |
| `@CurrentUser()`                | Get authenticated user/admin/operator |
| `@RequireAccountType(type)`     | Require USER/ADMIN/OPERATOR           |
| `@RequireService(slug?)`        | Require service membership            |
| `@RequireCountryConsent(code?)` | Require country consent               |
| `@Permissions(perm)`            | Admin permission check                |

---

**Detailed docs**: `docs/policies/GLOBAL_ACCOUNT.md`
