# Auth Service

> Authentication & authorization microservice

## Purpose

Handles user authentication, session management, and access control.

## Implementation Status

| Component      | Status         | Notes                          |
| -------------- | -------------- | ------------------------------ |
| REST API       | ✅ Implemented | External-facing API            |
| gRPC API       | 🔲 Planned     | For internal BFF communication |
| Rust Migration | 🔲 Planned     | Target: Rust + Axum + Tonic    |

## Tech Stack

**Current:**

- **Framework**: NestJS 11 + TypeScript 5.9
- **Database**: PostgreSQL 16 + Prisma 6
- **Auth**: Passport.js + JWT
- **Protocols**: REST (external)

**Planned (Future):**

- **Framework**: Rust + Axum (REST) + Tonic (gRPC)
- **Database**: PostgreSQL + SQLx
- **Protocols**: REST :3002 (external) + gRPC :50051 (internal)
- **Events**: NATS JetStream (publish)

## API Endpoints

### REST API (`/v1`)

**IMPORTANT: Global prefix is `v1`, NOT `/api/v1`**

```typescript
// Registration
POST /v1/auth/register
Body: { email: string, password: string, name: string }
Response: { user: User, accessToken: string, refreshToken: string }

// Local Login
POST /v1/auth/login
Body: { email: string, password: string }
Response: { accessToken: string, refreshToken: string }

// Google OAuth
GET /v1/auth/google
Response: Redirect to Google OAuth

GET /v1/auth/google/callback
Query: { code: string }
Response: { accessToken: string, refreshToken: string }

// Refresh Token
POST /v1/auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string }

// Logout
POST /v1/auth/logout
Headers: Authorization: Bearer {token}
Response: 204 No Content

// User Profile
GET /v1/users/me
Headers: Authorization: Bearer {token}
Response: User

// Update Profile
PATCH /v1/users/me
Headers: Authorization: Bearer {token}
Body: { name?: string, avatar?: string }
Response: User

// Change Password
POST /v1/users/me/change-password
Headers: Authorization: Bearer {token}
Body: { currentPassword: string, newPassword: string }
Response: { message: 'Password changed successfully' }

// Domain Access Token (Time-limited)
POST /v1/domain-access/grant
Headers: Authorization: Bearer {token}
Body: { domain: string, expiresInHours: number, recipientEmail?: string }
Response: { accessToken: string, expiresAt: string, accessUrl: string }
```

### Access via Domain (Production/Staging)

When accessing via `https://my-api-dev.girok.dev`:

```
Frontend URL: https://my-api-dev.girok.dev/auth/v1/auth/register
             ↓ Istio rewrites /auth/ → /
Auth Service: /v1/auth/register
```

**Example URLs:**

- Registration: `https://my-api-dev.girok.dev/auth/v1/auth/register`
- Login: `https://my-api-dev.girok.dev/auth/v1/auth/login`
- Profile: `https://my-api-dev.girok.dev/auth/v1/users/me`
- Health: `https://my-api-dev.girok.dev/auth/health` (no /v1 prefix)

### gRPC API (Internal - Port 50051) 🔲 PLANNED

> **Note**: gRPC will be implemented during Rust migration or when GraphQL BFF is added.

```protobuf
// proto/auth.proto (planned)
syntax = "proto3";

package auth;

service AuthService {
  // Authentication
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc RefreshToken(RefreshTokenRequest) returns (RefreshTokenResponse);

  // User management
  rpc GetUser(GetUserRequest) returns (User);
  rpc GetUserByUsername(GetUserByUsernameRequest) returns (User);
  rpc GetUsersByIds(GetUsersByIdsRequest) returns (UsersResponse);
  rpc UpdateUser(UpdateUserRequest) returns (User);

  // Health
  rpc Health(Empty) returns (HealthResponse);
}

message LoginRequest {
  string email = 1;
  string password = 2;
}

message LoginResponse {
  string access_token = 1;
  string refresh_token = 2;
  User user = 3;
}

message ValidateTokenRequest {
  string token = 1;
}

message ValidateTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string email = 3;
  string role = 4;
}

message User {
  string id = 1;
  string email = 2;
  string username = 3;
  string name = 4;
  string avatar = 5;
  string role = 6;
  string provider = 7;
  string created_at = 8;
}
```

**gRPC Controller (Planned):**

```typescript
// src/auth/auth.grpc.controller.ts (planned implementation)
@Controller()
export class AuthGrpcController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { user, accessToken, refreshToken } = await this.authService.login(
      data.email,
      data.password,
    );

    // Publish login event
    await this.natsService.publish('auth.user.logged_in', {
      userId: user.id,
      timestamp: new Date(),
    });

    return { user, accessToken, refreshToken };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    try {
      const payload = await this.jwtService.verifyAsync(data.token);
      return {
        valid: true,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      return { valid: false };
    }
  }

  @GrpcMethod('AuthService', 'GetUser')
  async getUser(data: GetUserRequest): Promise<User> {
    return this.usersService.findById(data.userId);
  }
}
```

## Key Flows

### Registration Flow

```typescript
1. Client sends: { email, password, name }
2. Validate DTO (class-validator)
3. Check if email exists → 409 Conflict if exists
4. Hash password (bcrypt, 12 rounds)
5. Create user in DB
6. Generate JWT tokens (Access 15min, Refresh 7days)
7. Return { user, accessToken, refreshToken }
```

### Login Flow

```typescript
1. Client sends: { email, password }
2. Find user by email
3. Compare password hash (bcrypt)
4. If invalid → 401 Unauthorized
5. Generate JWT tokens
6. Create session record (optional)
7. Return { accessToken, refreshToken }
```

### Google OAuth Flow

```typescript
1. Client redirects to: GET /api/v1/auth/google
2. Service redirects to Google OAuth consent
3. User approves on Google
4. Google redirects to: GET /api/v1/auth/google/callback?code=...
5. Service exchanges code for Google tokens
6. Fetch user profile from Google
7. Find or create user in DB
8. Generate JWT tokens
9. Redirect to client with tokens (query params or cookies)
```

### Token Refresh Flow

```typescript
1. Client sends: { refreshToken }
2. Verify refresh token (jwt.verify)
3. Check if token blacklisted
4. Generate new access token (15min)
5. Optionally rotate refresh token
6. Return { accessToken, refreshToken? }
```

### Password Change Flow

```typescript
1. Client sends: { currentPassword, newPassword }
2. Verify JWT token (user must be authenticated)
3. Check if user is OAuth user → 401 if OAuth (they don't have passwords)
4. Verify current password with bcrypt.compare
5. If invalid → 401 Unauthorized
6. Hash new password (bcrypt, 12 rounds)
7. Update user password in DB
8. Return { message: 'Password changed successfully' }
```

### Domain Access Flow

```typescript
// Use case: Share resume for 24 hours
1. Authenticated user requests domain access
2. Validate domain ownership
3. Generate time-limited token (1-72 hours)
4. Store in DomainAccessTokens table
5. Return { accessToken, expiresAt, accessUrl }
6. Recipient uses token for specific domain only
7. Cron job cleans expired tokens
```

## Multi-Provider Strategy

```typescript
// Supported providers
enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  // Future: KAKAO, NAVER, APPLE, GITHUB
}

// Strategy interface
interface AuthStrategy {
  provider: AuthProvider;
  validate(credentials: any): Promise<User>;
  register?(data: any): Promise<User>;
}

// Implementation: services/auth-service/src/auth/strategies/google.strategy.ts
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  async validate(accessToken: string, refreshToken: string, profile: any) {
    return this.usersService.findOrCreateGoogleUser(profile);
  }
}
```

## Database Schema

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String?   // null for OAuth users
  name          String?
  avatar        String?
  role          Role      @default(USER)
  provider      AuthProvider @default(LOCAL)
  providerId    String?   // Google ID, etc.
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  domainAccess  DomainAccessToken[]
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([userId])
}

model DomainAccessToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  domain    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([domain])
}

enum Role {
  USER
  ADMIN
}

enum AuthProvider {
  LOCAL
  GOOGLE
}
```

## Guards

```typescript
// JWT Guard (protect routes)
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

// Roles Guard
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Get('admin/users')
getAllUsers() {
  return this.usersService.findAll();
}
```

## Integration Points

### Current (REST)

- **web-main**: Direct REST calls for auth (login, register, profile)
- **personal-service**: No direct integration (same DB user ID)

### Planned (gRPC) 🔲

- **graphql-bff**: Login, register, token validation, user lookup
- **ws-gateway**: Token validation for WebSocket auth
- **personal-service**: User lookup

### Events (NATS) 🔲 Planned

- Publish: `auth.user.registered`, `auth.user.logged_in`, `auth.user.password_changed`
- Subscribe: None

### NATS Events Published (Planned) 🔲

```typescript
// Will be implemented with NATS JetStream
'auth.user.registered' -> { userId, email, provider }
'auth.user.logged_in' -> { userId, timestamp }
'auth.user.password_changed' -> { userId }
'auth.user.profile_updated' -> { userId, fields }
```

## Environment Variables

```bash
# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.mygirok.dev/api/v1/auth/google/callback

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/auth_db
```

## Common Patterns

### Password Validation

```typescript
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsString()
  @MinLength(2)
  name: string;
}
```

### JWT Generation

```typescript
generateTokens(user: User) {
  const payload = { sub: user.id, email: user.email, role: user.role };

  return {
    accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
    refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
  };
}
```

## Security Considerations

- Password hashing: bcrypt with 12 rounds
- JWT secrets: Rotate every 90 days
- Refresh tokens: Store in DB, support revocation
- Rate limiting: 5 req/min for login/register
- Account lockout: After 5 failed attempts (30 min)

## Adding New Provider

1. Add to `AuthProvider` enum in `packages/types`
2. Create strategy: `src/auth/strategies/[provider].strategy.ts`
3. Register in `auth.module.ts`
4. Add callback route in controller
5. Add OAuth credentials to .env

**Example: Adding Kakao OAuth**

```typescript
// 1. Update enum
enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  KAKAO = 'kakao',  // New
}

// 2. Create strategy
@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  async validate(accessToken: string, refreshToken: string, profile: any) {
    return this.usersService.findOrCreateKakaoUser(profile);
  }
}

// 3. Add routes
@Get('kakao')
@UseGuards(AuthGuard('kakao'))
kakaoAuth() {}

@Get('kakao/callback')
@UseGuards(AuthGuard('kakao'))
kakaoAuthCallback(@Req() req, @Res() res) {
  const tokens = this.authService.generateTokens(req.user);
  res.redirect(`${FRONTEND_URL}?token=${tokens.accessToken}`);
}
```

## Legal & Consent API (`/v1/legal`)

### REST Endpoints

```typescript
// Get consent requirements (public - no auth)
GET /v1/legal/consent-requirements
Query: { locale?: string }  // 'ko' | 'en' | 'ja'
Response: ConsentRequirement[]

// Get legal document by type (public - no auth)
GET /v1/legal/documents/:type
Params: type = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING_POLICY' | 'PERSONALIZED_ADS'
Query: { locale?: string, version?: string }
Response: LegalDocumentResponseDto

// Get legal document by ID (public - no auth)
GET /v1/legal/documents/by-id/:id
Response: LegalDocumentResponseDto

// Get current user's consents (auth required)
GET /v1/legal/consents
Headers: Authorization: Bearer {token}
Response: UserConsentResponseDto[]

// Create consents during registration (auth required)
POST /v1/legal/consents
Headers: Authorization: Bearer {token}
Body: { consents: [{ type: ConsentType, agreed: boolean }] }
Response: UserConsentResponseDto[]

// Update consent (agree or withdraw) (auth required)
PUT /v1/legal/consents/:type
Headers: Authorization: Bearer {token}
Body: { agreed: boolean }
Response: UserConsentResponseDto

// Check if user has all required consents (auth required)
GET /v1/legal/consents/check
Headers: Authorization: Bearer {token}
Response: { hasAllRequired: boolean }
```

### Consent Types

```typescript
enum ConsentType {
  TERMS_OF_SERVICE      // [Required] 이용약관 동의
  PRIVACY_POLICY        // [Required] 개인정보 수집·이용 동의
  MARKETING_EMAIL       // [Optional] 마케팅 이메일 수신 동의
  MARKETING_PUSH        // [Optional] 마케팅 푸시 알림 동의
  MARKETING_PUSH_NIGHT  // [Optional] 야간 푸시 알림 동의 (21:00-08:00)
  MARKETING_SMS         // [Optional] 마케팅 SMS 수신 동의
  PERSONALIZED_ADS      // [Optional] 맞춤형 광고 동의
  THIRD_PARTY_SHARING   // [Optional] 제3자 정보 제공 동의
}

enum LegalDocumentType {
  TERMS_OF_SERVICE      // 이용약관
  PRIVACY_POLICY        // 개인정보처리방침
  MARKETING_POLICY      // 마케팅 정보 수신 동의
  PERSONALIZED_ADS      // 맞춤형 광고 동의
}
```

### Registration with Consents Flow

```typescript
1. Client fetches: GET /v1/legal/consent-requirements
2. User reviews documents and agrees to required/optional consents
3. Client sends registration:
   POST /v1/auth/register
   Body: {
     email, username, password, name,
     consents: [{ type: ConsentType, agreed: boolean }],
     language?: string,  // User's locale
     country?: string,   // Region for consent policy
     timezone?: string   // User's timezone
   }
4. Server creates user + consent records in transaction
5. Response: { user, accessToken, refreshToken }
```

### Database Models

```prisma
model LegalDocument {
  id            String           @id @default(uuid())
  type          LegalDocumentType
  version       String           // "1.0.0", "1.1.0"
  locale        String           @default("ko")
  title         String
  content       String           @db.Text
  summary       String?          @db.Text
  effectiveDate DateTime
  isActive      Boolean          @default(true)
  consents      UserConsent[]
}

model UserConsent {
  id              String           @id @default(uuid())
  userId          String
  user            User
  consentType     ConsentType
  documentId      String?
  document        LegalDocument?
  documentVersion String?
  agreed          Boolean          @default(true)
  agreedAt        DateTime
  withdrawnAt     DateTime?
  ipAddress       String?          // Audit trail
  userAgent       String?          // Audit trail
}
```

## Health Check

```typescript
GET /health
Response: { status: 'ok', database: 'up' }

GET /health/ready
Response: { status: 'ok', database: 'up', redis: 'up' }
```
