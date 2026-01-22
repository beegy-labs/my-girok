# Auth Service

Authentication and authorization microservice for my-girok.

## Features

- **Multi-provider Authentication**
  - Local (Email/Password)
  - Google OAuth 2.0
  - Kakao OAuth
  - Naver OAuth

- **Role-based Access Control**
  - GUEST - View-only access
  - USER - Standard authenticated user
  - MANAGER - Content moderation
  - MASTER - Full system access

- **JWT Token Management**
  - Access tokens (15 minutes)
  - Refresh tokens (7 days)
  - Domain access tokens (configurable hours)

- **Time-limited Domain Access**
  - Share specific content with expiration
  - Example: Resume sharing for 24 hours

## Tech Stack

- NestJS 11.1
- PostgreSQL 16 + Prisma 7
- Passport.js + JWT
- bcrypt for password hashing

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- Database URL
- JWT secrets
- OAuth credentials (Google, Kakao, Naver)

### 3. Initialize Database

```bash
# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev --name init
```

### 4. Start Development Server

```bash
pnpm dev
```

Server runs on `http://localhost:4001`

## API Endpoints

### Authentication

```bash
# Register
POST /api/v1/auth/register
Body: { email, password, name }

# Login
POST /api/v1/auth/login
Body: { email, password }

# Refresh Token
POST /api/v1/auth/refresh
Body: { refreshToken }

# Logout
POST /api/v1/auth/logout
Headers: Authorization: Bearer {token}
Body: { refreshToken }
```

### OAuth

```bash
# Google OAuth
GET /api/v1/auth/google
GET /api/v1/auth/google/callback

# Kakao OAuth
GET /api/v1/auth/kakao
GET /api/v1/auth/kakao/callback

# Naver OAuth
GET /api/v1/auth/naver
GET /api/v1/auth/naver/callback
```

### User Management

```bash
# Get Profile
GET /api/v1/users/me
Headers: Authorization: Bearer {token}

# Update Profile
PATCH /api/v1/users/me
Headers: Authorization: Bearer {token}
Body: { name?, avatar? }
```

### Domain Access

```bash
# Grant time-limited access
POST /api/v1/auth/domain-access
Headers: Authorization: Bearer {token}
Body: { domain: 'resume', expiresInHours: 24, recipientEmail?: string }
```

## Database Schema

See `prisma/schema.prisma` for the complete schema.

### Main Models

- **User** - User accounts with multi-provider support
- **Session** - Refresh token storage
- **DomainAccessToken** - Time-limited access tokens

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:4001/api/v1/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### Kakao OAuth

1. Go to [Kakao Developers](https://developers.kakao.com/)
2. Create an application
3. Enable Kakao Login
4. Set redirect URI: `http://localhost:4001/api/v1/auth/kakao/callback`
5. Copy REST API Key and Secret to `.env`

### Naver OAuth

1. Go to [Naver Developers](https://developers.naver.com/)
2. Register an application
3. Enable Login API
4. Set callback URL: `http://localhost:4001/api/v1/auth/naver/callback`
5. Copy Client ID and Secret to `.env`

## Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start:prod

# Run tests
pnpm test

# Database management
pnpm prisma studio        # Open database GUI
pnpm prisma migrate dev   # Create migration
pnpm prisma generate      # Generate client
```

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:4001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!@#","name":"Test User"}'
```

### Login

```bash
curl -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!@#"}'
```

### Get Profile

```bash
curl -X GET http://localhost:4001/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions.

## Security Considerations

- Passwords are hashed with bcrypt (12 rounds)
- JWT secrets should be rotated every 90 days
- Refresh tokens are stored in database for revocation
- Rate limiting recommended for auth endpoints (implement in Gateway/BFF)
- HTTPS required in production

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
