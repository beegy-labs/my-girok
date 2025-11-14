# LLM Guidelines - my-girok

> Personal Archive Platform | API Gateway + Multi-Platform Apps

## Documentation Policy

**IMPORTANT: All documentation, policies, and technical guides MUST be written in English.**
- README.md: English
- LLM_GUIDELINES.md: English
- API documentation: English
- Code comments: English
- Commit messages: English

## Additional Guidelines

For detailed policies, refer to:
- **[SECURITY.md](SECURITY.md)** - Security policies, authentication, secrets management
- **[TESTING.md](TESTING.md)** - Testing standards, coverage requirements, CI/CD
- **[PERFORMANCE.md](PERFORMANCE.md)** - Performance optimization, caching, monitoring
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Kubernetes deployment, secrets management, CI/CD pipelines

## Deployment Environment

**IMPORTANT**: All deployments except app development are performed on Kubernetes.

```
Development Environment:
- Local: Docker Compose (for rapid development)
- All apps: Run directly on local machine

Deployment Environment (Kubernetes):
- Staging: Kubernetes cluster
- Production: Kubernetes cluster
```

**Kubernetes Directory Structure:**
```
my-girok/
├── k8s/
│   ├── base/                     # Kustomize base
│   │   └── services/
│   │       ├── auth-service/
│   │       ├── content-api/
│   │       └── web-bff/
│   ├── overlays/
│   │   ├── staging/
│   │   └── production/
│   └── secrets/                  # Sealed Secrets (encrypted)
│       ├── staging/
│       └── production/
```

**Deployment Commands:**
```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production
kubectl apply -k k8s/overlays/production
```

## Stack

**Web:** React 19.2 + Vite 7.2, Next.js 15, TypeScript 5.7, Tailwind CSS 3.4
**Mobile:** Flutter 3.24+ (Dart 3.5+) - iOS & Android
**Backend:** Node.js 22, NestJS 11 (API Gateway Pattern)
**Database:** PostgreSQL 16 + Prisma 6 + Redis
**AI:** Python 3.13, FastAPI
**Tools:** pnpm, Turborepo

## Architecture Overview

### Flexible Multi-Pattern Architecture

**ALL patterns can coexist simultaneously!**

```
Routing Options (pick any combination):
1. Client → BFF (REST or GraphQL) → Services
2. Client → API Gateway → BFF → Services
3. Client → API Gateway → Services (direct)
4. Client → Services (direct, for internal use)

API Style Options (mix and match):
- REST only
- GraphQL only
- REST + GraphQL (both on same service)
```

**Project Structure:**
```
my-girok/
├── apps/                  # Clients
├── services/
│   ├── gateway/
│   │   ├── api-gateway/   # Optional shared gateway
│   │   ├── web-bff/       # REST + GraphQL
│   │   └── mobile-bff/    # REST + GraphQL
│   ├── auth-service/      # REST + GraphQL
│   ├── content-api/       # REST + GraphQL
│   └── llm-api/           # REST only
└── packages/              # Shared code
```

**Key Principle: Everything is Optional and Composable**

### Architecture Patterns Explained

**1. API Gateway (Optional)**
- Central routing and common middleware
- Can be bypassed if BFFs handle everything
- Use when: Shared logic across all BFFs

**2. BFF Layer (Optional)**
- Client-specific API optimization
- Can expose REST, GraphQL, or both
- Use when: Different clients need different data shapes

**3. Service Layer (Always Present)**
- Core business logic
- Can expose REST, GraphQL, or both
- Backend services are protocol-agnostic

**4. Routing Flexibility**

```typescript
// Example: All these work simultaneously!

// Option A: Web uses GraphQL via BFF
Web → web-bff/graphql → auth-service/rest

// Option B: Mobile uses REST via BFF
Mobile → mobile-bff/rest → content-api/rest

// Option C: Direct to service (internal)
Admin → auth-service/graphql (direct)

// Option D: Through gateway
Client → api-gateway → web-bff/graphql → services
```

### GraphQL + REST Coexistence Pattern

**At BFF Level:**
```typescript
// services/gateway/web-bff/src/app.module.ts
@Module({
  imports: [
    // GraphQL setup
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      path: '/graphql',  // GraphQL at /graphql
    }),
    // REST setup
    RestModule,  // REST at /api/*
  ],
})
export class AppModule {}

// Now you have:
// http://web-bff/graphql  ← GraphQL endpoint
// http://web-bff/api/*    ← REST endpoints
```

**At Service Level:**
```typescript
// services/auth-service/src/app.module.ts
@Module({
  imports: [
    // REST API
    RestModule.forRoot({
      prefix: '/api/v1',
    }),
    // GraphQL API (optional)
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      path: '/graphql',
    }),
  ],
})
export class AppModule {}

// Service exposes both:
// http://auth-service/api/v1/*  ← REST
// http://auth-service/graphql   ← GraphQL
```

**Benefits:**
- **No migration needed**: Add GraphQL alongside REST
- **Gradual adoption**: Clients can switch one endpoint at a time
- **Best of both**: Simple CRUD via REST, complex queries via GraphQL
- **Independence**: Each service/BFF chooses its own protocols

## Analytics (CRITICAL)

**MUST include in ALL frontend Root Layouts:**

```tsx
<Script
  src="https://rybbit.girok.dev/api/script.js"
  data-site-id="7a5f53c5f793"
  strategy="afterInteractive"
/>
```

**Rules:** Never remove, applies to all environments (dev/staging/prod)

## API Gateway Development

### Gateway Responsibilities

```typescript
// api-gateway/src/gateway/routes.config.ts
export const ROUTES = {
  auth: {
    prefix: '/api/auth',
    service: process.env.AUTH_SERVICE_URL,
    public: true,  // No auth required
  },
  content: {
    prefix: '/api/content',
    service: process.env.CONTENT_SERVICE_URL,
    public: false, // Auth required
  },
  llm: {
    prefix: '/api/ai',
    service: process.env.LLM_SERVICE_URL,
    public: false,
  },
};
```

**Gateway Middleware Order:**
1. CORS handling
2. Rate limiting (by IP/User)
3. Request logging
4. JWT validation (if route not public)
5. Route to appropriate service
6. Response transformation

### Service Development (NestJS)

**Core Structure:**
```
services/auth-service/src/
├── auth/
│   ├── strategies/        # local.strategy, google.strategy
│   ├── guards/            # jwt.guard, roles.guard
│   ├── dto/               # login.dto, register.dto
│   └── auth.service.ts
├── users/
├── sessions/
├── domain-access/         # Time-limited access feature
├── common/
│   ├── decorators/        # @Transactional
│   └── interceptors/
└── database/
```

**Each service is independent:**
- Own database connection (via Prisma)
- Own business logic
- No direct calls to other services
- Communicate via Gateway or message queue

### Transaction AOP

```typescript
// Service
@Transactional()  // Auto commit/rollback
async create(dto: CreatePostDto) {
  await this.postsRepo.create(dto);
  await this.tagsRepo.connect(post.id, dto.tags);
  return post;
}

// Repository extends BaseRepository
async create(data: any) {
  return this.db.post.create({ data });  // Auto-detects transaction
}
```

**How it works:** Interceptor → AsyncLocalStorage → Auto commit/rollback

## Authentication System (CRITICAL)

### Multi-Provider Strategy Pattern

**Strategy Interface:**
```typescript
// packages/types/src/auth/index.ts
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  // Future: KAKAO, NAVER, APPLE, GITHUB
}

export interface AuthStrategy {
  provider: AuthProvider;
  validate(credentials: any): Promise<User>;
  register?(data: any): Promise<User>;
}
```

**Implementation Example:**
```typescript
// auth-service/src/auth/strategies/google.strategy.ts
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private usersService: UsersService,
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const user = await this.usersService.findOrCreateGoogleUser(profile);
    return user;
  }
}
```

**Adding New Provider (4 Steps):**
1. Add enum to `AuthProvider` in `packages/types`
2. Create strategy file: `[provider].strategy.ts`
3. Register in `auth.module.ts`
4. Add callback route in controller

### Time-Limited Domain Access

**Feature:** Grant temporary access to specific domains without full account access

```typescript
// Example: Share resume for 24 hours
POST /api/auth/domain-access/grant
{
  "domain": "resume.mygirok.dev",
  "expiresInHours": 24,
  "recipientEmail": "recruiter@company.com" // optional
}

Response: {
  "accessToken": "temp_xyz123...",
  "expiresAt": "2025-11-06T12:00:00Z",
  "accessUrl": "https://resume.mygirok.dev?token=temp_xyz123"
}
```

**Implementation:**
- Separate table: `DomainAccessTokens`
- Cron job cleanup expired tokens
- Middleware validates domain-specific tokens
- Cannot be used for other domains

## Frontend Development

### Web (Next.js 15)

```
apps/web/main/
├── app/              # App Router
│   ├── (auth)/      # Auth group
│   │   ├── login/
│   │   └── register/
│   ├── (main)/      # Main content group
│   └── api/         # API routes (if needed)
├── components/
│   ├── auth/        # Login, Register forms
│   ├── layout/      # Header, Footer, Sidebar
│   └── shared/      # Buttons, Inputs, etc.
└── lib/
    ├── api/         # API client (fetch wrapper)
    ├── auth/        # Auth helpers, token storage
    └── utils/
```

**API Client Pattern:**
```typescript
// lib/api/client.ts
const apiClient = {
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,

  async request(endpoint: string, options?: RequestInit) {
    const token = getAccessToken();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      await refreshToken();
      return this.request(endpoint, options); // Retry
    }

    return response.json();
  },
};
```

### Mobile Development (Flutter)

```dart
// apps/mobile-flutter/lib/core/api/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String baseUrl = 'https://mobile-bff.mygirok.dev/api';

  late final Dio _dio;
  final FlutterSecureStorage _storage;

  ApiClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // Add JWT token to all requests
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 - refresh token
          if (error.response?.statusCode == 401) {
            if (await _refreshToken()) {
              // Retry the original request
              final opts = error.requestOptions;
              final token = await _storage.read(key: 'access_token');
              opts.headers['Authorization'] = 'Bearer $token';

              try {
                final response = await _dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final accessToken = response.data['accessToken'];
      await _storage.write(key: 'access_token', value: accessToken);

      if (response.data['refreshToken'] != null) {
        await _storage.write(
          key: 'refresh_token',
          value: response.data['refreshToken'],
        );
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  Dio get dio => _dio;
}
```

**Secure Storage (Cross-Platform):**
```dart
// Handles platform-specific secure storage automatically
// - iOS: Keychain
// - Android: EncryptedSharedPreferences

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();

// Save token
await storage.write(key: 'access_token', value: token);

// Read token
final token = await storage.read(key: 'access_token');

// Delete token
await storage.delete(key: 'access_token');
```

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # Set DATABASE_URL, JWT_SECRET
cd backend/main-api && pnpm prisma migrate dev && pnpm prisma generate
pnpm dev  # All apps
```

## Development Workflow

### New Feature

1. Define types in `packages/types`
2. Update Prisma schema → `pnpm prisma migrate dev`
3. Create Repository (extends BaseRepository)
4. Create Service (use `@Transactional()` if needed)
5. Create Controller (add validation)
6. Frontend API call with shared types

### Type Sharing

```typescript
// ✅ DO: Import from shared types
import type { Post, CreatePostDto } from '@my-girok/types';

// ❌ DON'T: Duplicate definitions
```

### Transaction Pattern

```typescript
// ✅ DO: Use @Transactional()
@Transactional()
async update(id: string, dto: UpdateDto) {
  await this.postsRepo.update(id, dto);
  await this.tagsRepo.sync(id, dto.tags);
  // Auto rollback if any fails
}

// ❌ DON'T: Manual transactions
```

## Git & Commit Policy (CRITICAL)

### Branch Strategy

- `main`: production-ready code
- `develop`: integration branch (if using)
- `feature/*`: new features
- `fix/*`: bug fixes
- `hotfix/*`: urgent production fixes

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```
feat(auth): add Google OAuth provider

Implement Google OAuth 2.0 authentication strategy using Passport.
Users can now login with their Google accounts.

Closes #123

fix(posts): resolve N+1 query in post list

Added Prisma include to fetch author data in single query.
Response time improved from 500ms to 50ms.

refactor(cache): extract cache service to shared package

Moved Redis cache logic to packages/cache for reuse across services.
```

### Pull Request Requirements

**Before creating PR:**
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No TypeScript errors
- [ ] Code coverage meets minimum (80%)
- [ ] Updated documentation if needed
- [ ] Added tests for new features

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

**Review Requirements:**
- Requires 1 approval
- All CI checks must pass
- No merge conflicts
- Branch up-to-date with base

### Branch Protection (GitHub)

```yaml
# Settings > Branches > Branch protection rules
main:
  - Require pull request before merging
  - Require approvals: 1
  - Dismiss stale reviews
  - Require status checks to pass
  - Require branches to be up to date
  - Require conversation resolution
  - No force pushes
  - No deletions
```

## Critical Rules

### Multi-Pattern Architecture (MUST FOLLOW)

1. **Routing is flexible**: Client can use Gateway, BFF, or direct to services
2. **Protocol is flexible**: Services can expose REST, GraphQL, or both
3. **Everything is optional**: Gateway and BFF are optional layers
4. **Services are independent**: Each service chooses its own protocols
5. **No tight coupling**: Services communicate via HTTP APIs, not direct calls
6. **Each service has own database** (via Prisma schema)

### When to Use Each Layer

**Use API Gateway when:**
- Need centralized auth/rate limiting across ALL services
- Want single entry point for external clients
- Need request/response logging in one place

**Use BFF when:**
- Different clients need different data shapes
- Need to aggregate multiple service calls
- Want client-specific caching strategies
- GraphQL benefits (flexible queries)

**Skip layers when:**
- Internal admin tools (can call services directly)
- Simple microservice communication
- Prototyping/development speed is priority

### Protocol Selection Guidelines

**Use REST when:**
- Simple CRUD operations
- Standard HTTP semantics (GET/POST/PUT/DELETE)
- Easy to cache (HTTP caching)
- Mobile apps prefer simplicity

**Use GraphQL when:**
- Complex nested data requirements
- Clients need flexible field selection
- Want to reduce over-fetching
- Real-time subscriptions needed

**Use Both when:**
- You have diverse client needs
- Gradual migration from REST to GraphQL
- Want best of both worlds

### Authentication (MUST FOLLOW)

1. **Multi-provider ready**: Always use Strategy pattern
2. **JWT tokens**: Access (15min) + Refresh (7days)
3. **Secure storage**:
   - Web: HttpOnly cookies + localStorage
   - iOS: Keychain
   - Android: EncryptedSharedPreferences
4. **Token validation**: Always at Gateway level
5. **New provider**: 4 steps (enum → strategy → module → route)

### Development Rules

**NEVER:**
1. Duplicate types → Use `packages/types`
2. Prisma in Controllers → Use Services
3. Hardcode env vars → Use ConfigService/process.env
4. Make synchronous service-to-service calls → Use HTTP clients
5. Skip async/await on async operations
6. Omit error handling
7. Remove Rybbit analytics script
8. Write documentation in non-English
9. Tightly couple services → Keep them independent
10. Commit secrets to git (use Sealed Secrets for Kubernetes)
11. Log sensitive data (passwords, tokens)
12. Store plain text Kubernetes Secrets in Git

**ALWAYS:**
1. Define types first in `packages/types`
2. Use DTO validation (class-validator)
3. Apply `@Transactional()` for multi-step DB operations
4. Use Guards for protected endpoints
5. Prevent N+1 queries (Prisma include/select or DataLoader)
6. Paginate large queries
7. Include Rybbit in Root Layouts
8. Write documentation in English
9. Keep services protocol-agnostic (can add REST or GraphQL anytime)
10. Use Strategy pattern for extensible features
11. Document which protocol (REST/GraphQL) each endpoint uses
12. Write tests for new features (80% coverage minimum)
13. Follow git commit conventions
14. Create PRs for code review

## Common Mistakes

```typescript
// ❌ DB in Controller
@Get() findAll() { return this.prisma.post.findMany(); }

// ✅ Use Service
@Get() findAll() { return this.postsService.findAll(); }

// ❌ N+1 Query
const posts = await prisma.post.findMany();
for (const post of posts) {
  post.author = await prisma.user.findUnique(...);
}

// ✅ Include
const posts = await prisma.post.findMany({ include: { author: true } });

// ❌ Hardcoded secret
const JWT_SECRET = 'my-secret-123';

// ✅ Use ConfigService
this.configService.get<string>('JWT_SECRET');

// ❌ No validation
@Post() create(@Body() dto: any) { ... }

// ✅ DTO validation
@Post() create(@Body() dto: CreatePostDto) { ... }
```

## Commands

```bash
pnpm dev                              # Dev mode
pnpm --filter main-api dev            # Specific package
pnpm prisma studio/migrate/generate   # DB tools
pnpm build && pnpm test               # Build & test
pnpm lint                             # Lint code
```

## Development Checklist

### New Backend Service
- [ ] Create service directory in `services/`
- [ ] Setup NestJS with Prisma
- [ ] Define Prisma schema
- [ ] Add route config to Gateway
- [ ] Setup environment variables
- [ ] Implement health check endpoint
- [ ] Add to docker-compose
- [ ] Document API endpoints
- [ ] Write tests

### New Auth Provider
- [ ] Add to `AuthProvider` enum in `packages/types`
- [ ] Create strategy file: `[provider].strategy.ts`
- [ ] Implement `validate()` and optionally `register()`
- [ ] Register in `auth.module.ts`
- [ ] Add callback route in controller
- [ ] Add OAuth credentials to .env
- [ ] Test full OAuth flow
- [ ] Update documentation

### New Feature
- [ ] Types in `packages/types`
- [ ] Prisma schema + migration
- [ ] DTO validation (class-validator)
- [ ] Repository (extends BaseRepository)
- [ ] Service + `@Transactional()` if multi-step
- [ ] Controller + Guards
- [ ] Add route to Gateway config
- [ ] API documentation (Swagger)
- [ ] Tests (unit + e2e, 80% coverage)
- [ ] Create PR for review

### New Frontend App
- [ ] Create in `apps/web/` or `apps/mobile/`
- [ ] Configure API client (Gateway URL)
- [ ] Setup auth token storage
- [ ] Implement token refresh logic
- [ ] Rybbit script in Root Layout (web only)
- [ ] Error handling + loading states
- [ ] Tests

### Before Deployment
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] Gateway/BFF routes configured correctly
- [ ] CORS settings verified
- [ ] Rate limiting configured
- [ ] Health checks working (all services)
- [ ] Logging and monitoring setup
- [ ] SSL certificates ready
- [ ] Kubernetes manifests validated (`kubectl apply --dry-run`)
- [ ] Sealed Secrets created for all sensitive data
- [ ] Resource limits set (CPU, memory)
- [ ] HPA (Horizontal Pod Autoscaler) configured
- [ ] Ingress rules verified
- [ ] Security checklist completed (see SECURITY.md)
- [ ] Performance requirements met (see PERFORMANCE.md)
- [ ] All tests passing (see TESTING.md)
- [ ] Deployment guide followed (see DEPLOYMENT.md)

## Docs

### Frameworks
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [Next.js 15](https://nextjs.org/docs)
- [Kubernetes](https://kubernetes.io/docs/)

### Project Guidelines
- [SECURITY.md](SECURITY.md) - Security policies, Kubernetes Secrets management
- [TESTING.md](TESTING.md) - Testing standards, CI/CD
- [PERFORMANCE.md](PERFORMANCE.md) - Performance optimization
- [DEPLOYMENT.md](DEPLOYMENT.md) - Kubernetes deployment guide
