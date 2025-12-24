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
POST /v1/auth/register    # { email, password, name, consents[] }
POST /v1/auth/login       # { email, password }
POST /v1/auth/refresh     # { refreshToken }
POST /v1/auth/logout      # (auth required)
GET  /v1/auth/google      # OAuth redirect
GET  /v1/auth/google/callback
POST /v1/auth/domain-access  # Time-limited token
```

### Users

```
GET   /v1/users/me                    # Profile (auth)
PATCH /v1/users/me                    # Update (auth)
POST  /v1/users/me/change-password    # Change password (auth)
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

### Admin Auth (H-RBAC)

```
POST /v1/admin/auth/login     # { email, password }
POST /v1/admin/auth/refresh   # { refreshToken }
GET  /v1/admin/auth/me        # Admin profile
POST /v1/admin/auth/logout    # { refreshToken }
```

### Admin Tenant Management

```
GET    /v1/admin/tenants           # List (tenant:read)
GET    /v1/admin/tenants/:id       # Detail (tenant:read)
POST   /v1/admin/tenants           # Create (tenant:create)
PUT    /v1/admin/tenants/:id       # Update (tenant:update)
PATCH  /v1/admin/tenants/:id/status # Approve/Suspend (tenant:approve)
GET    /v1/admin/tenants/me        # Own tenant (Tenant Admin)
PUT    /v1/admin/tenants/me        # Update own (Tenant Admin)
```

### Admin Legal Management

```
GET    /v1/admin/legal/documents        # List (legal:read)
GET    /v1/admin/legal/documents/:id    # Detail (legal:read)
POST   /v1/admin/legal/documents        # Create (legal:create)
PUT    /v1/admin/legal/documents/:id    # Update (legal:update)
DELETE /v1/admin/legal/documents/:id    # Soft delete (legal:delete)
GET    /v1/admin/legal/consents         # User consents (legal:read)
GET    /v1/admin/legal/consents/stats   # Statistics (legal:read)
```

## Key Flows

### Registration

1. Validate DTO → Check email exists → Hash password (bcrypt 12)
2. Create user + consents in transaction
3. Generate tokens → Return { user, accessToken, refreshToken }

### Login

1. Find user → Verify password → Generate tokens
2. Create session → Return { accessToken, refreshToken }

### Token Refresh

1. Verify refresh token → Check blacklist
2. Generate new access token (15min)

## JWT Configuration

| Token   | Expiration | Storage         |
| ------- | ---------- | --------------- |
| Access  | 15 min     | localStorage    |
| Refresh | 14 days    | HttpOnly cookie |

## Database Schema

```prisma
model User {
  id            String       @id @default(uuid())
  email         String       @unique
  username      String       @unique
  password      String?      // null for OAuth
  role          Role         @default(USER)
  provider      AuthProvider @default(LOCAL)
  region        String?      // KR, JP, EU, US
}
```

## Enums

| Enum         | Values                                         |
| ------------ | ---------------------------------------------- |
| Role         | GUEST, USER, MANAGER, MASTER                   |
| AuthProvider | LOCAL, GOOGLE, KAKAO, NAVER, APPLE             |
| ConsentType  | TERMS*OF_SERVICE, PRIVACY_POLICY, MARKETING*\* |
| AdminScope   | SYSTEM, TENANT                                 |
| TenantType   | INTERNAL (v1), COMMERCE, ADBID, etc. (future)  |
| TenantStatus | PENDING, ACTIVE, SUSPENDED, TERMINATED         |

## H-RBAC (Admin System)

### Architecture

```
SYSTEM LEVEL (Platform Admin)
├── system_super   (level 100) - Full access (*)
├── system_admin   (level 80)  - Partner/User/Legal management
└── system_moderator (level 50) - Content moderation

TENANT LEVEL (Partner Admin)
├── partner_super  (level 100) - Full tenant access
├── partner_admin  (level 80)  - Admin management
└── partner_editor (level 50)  - View only
```

### Permission Pattern

```typescript
// Format: resource:action
@Permissions('legal:read')
@Permissions('tenant:approve')
@Permissions('user:suspend')

// Wildcard support
'*'          // All permissions
'legal:*'    // All legal actions
```

### Admin Guards

```typescript
@UseGuards(AdminAuthGuard, PermissionGuard)
@Permissions('legal:create')
@Post('documents')
createDocument(@CurrentAdmin() admin: AdminPayload) { ... }
```

## Guards

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MASTER)
@Get('admin/users')
getAllUsers() { ... }
```

## Security

- Password: bcrypt 12 rounds
- Rate limiting: 5 req/min (login/register)
- Account lockout: 5 failed attempts (30 min)

## Environment

```bash
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=14d
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_URL=postgresql://user:pass@postgres:5432/auth_db
```

---

**Human docs**: [docs/services/AUTH_SERVICE.md](../../docs/services/AUTH_SERVICE.md)
