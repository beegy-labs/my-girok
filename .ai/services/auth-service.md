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
