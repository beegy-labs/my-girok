# LLM Guidelines - my-girok

> Personal Archive Platform | Full BFF + GraphQL Federation + gRPC

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
│   │       ├── gateway/
│   │       │   ├── graphql-bff/
│   │       │   └── ws-gateway/
│   │       ├── auth-service/
│   │       ├── personal-service/
│   │       ├── feed-service/
│   │       ├── chat-service/
│   │       ├── matching-service/
│   │       └── media-service/
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

**Web:** React 19.2 + Vite 7.2, TypeScript 5.9, Tailwind CSS 4.1
**Mobile:** iOS (Swift), Android (Kotlin)
**Backend:** Node.js 24, NestJS 11
**Database:** PostgreSQL 16 + Prisma 6, MongoDB 8, Valkey 8 (Redis fork)
**AI:** Python 3.13, FastAPI
**Gateway:** Cilium Gateway API
**Protocols:** GraphQL (external), gRPC (internal), NATS JetStream (events)
**Tools:** pnpm, Turborepo

## Architecture Overview (2025)

### Full BFF Pattern + GraphQL Federation + gRPC

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cilium Gateway API                           │
│  api.girok.dev    ws.girok.dev    auth.girok.dev    s3.girok.dev   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
│  GraphQL BFF  │      │   WS Gateway    │      │  Auth Service  │
│ (Apollo Fed)  │      │  (Socket.io)    │      │  (REST+gRPC)   │
│   Port 4000   │      │   Port 3001     │      │   Port 3002    │
└───────┬───────┘      └────────┬────────┘      └────────────────┘
        │ gRPC                  │ NATS
        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Domain Services (gRPC)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Personal  │  │  Feed    │  │  Chat    │  │ Matching │           │
│  │PostgreSQL│  │ MongoDB  │  │ MongoDB  │  │ Valkey   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NATS JetStream (Events)                         │
│   auth.user.*   feed.post.*   chat.message.*   matching.match.*    │
└─────────────────────────────────────────────────────────────────────┘
```

**Project Structure:**
```
my-girok/
├── apps/                  # Clients
│   ├── web-main/          # React 19.2 + Vite
│   ├── web-admin/         # Admin dashboard
│   ├── ios/               # Swift iOS app
│   └── android/           # Kotlin Android app
├── services/
│   ├── gateway/
│   │   ├── graphql-bff/   # GraphQL Federation Gateway
│   │   └── ws-gateway/    # WebSocket Gateway (Socket.io)
│   ├── auth-service/      # Authentication (REST + gRPC)
│   ├── personal-service/  # Resume, Profile (gRPC + PostgreSQL)
│   ├── feed-service/      # Timeline, Posts (gRPC + MongoDB)
│   ├── chat-service/      # Messages, Rooms (gRPC + MongoDB)
│   ├── matching-service/  # Random matching (gRPC + Valkey)
│   ├── media-service/     # Image processing (gRPC + MinIO)
│   └── llm-api/           # AI features (Python FastAPI)
└── packages/              # Shared code
    ├── types/             # TypeScript types + Protobuf
    └── ui-components/     # React components
```

**Key Principle: Full BFF Pattern (IETF Recommended)**

### Layer Responsibilities

**Cilium Gateway API (Edge)**
- TLS termination
- L7 routing (path/host-based)
- Rate limiting at edge
- Autoscaling with KEDA

**GraphQL BFF (Session Layer)**
- Session management (HttpOnly cookies)
- Token storage (server-side)
- GraphQL Federation with Apollo
- Request aggregation

**WebSocket Gateway**
- Real-time event broadcasting
- Socket.io with Valkey adapter (cross-pod)
- NATS subscription → client push

**Domain Services (gRPC)**
- Single responsibility
- Polyglot persistence
- Event publishing to NATS

### Authentication Flow (Session-Based)

```
1. Client sends credentials to GraphQL BFF
2. BFF validates via Auth Service (gRPC)
3. Auth Service returns tokens
4. BFF creates session, stores tokens server-side
5. BFF sets HttpOnly cookie (session_id)
6. Client uses session cookie for all requests
7. Tokens NEVER exposed to browser (security)
```

```typescript
// GraphQL BFF session management
ctx.res.cookie('session_id', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### Internal Communication

**gRPC for service-to-service:**
- 3-10x faster than REST
- Type-safe with Protobuf
- Streaming support

**NATS JetStream for events:**
- At-least-once delivery
- Consumer groups
- Event sourcing / CQRS

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

## GraphQL BFF Development

### Apollo Federation Gateway

```typescript
// graphql-bff/src/app.module.ts
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'auth', url: 'http://auth-service:50051/graphql' },
            { name: 'personal', url: 'http://personal-service:50052/graphql' },
            { name: 'feed', url: 'http://feed-service:50053/graphql' },
          ],
        }),
      },
    }),
    SessionModule,
    GrpcClientsModule,
  ],
})
```

### Session Guard

```typescript
// Every authenticated request validates session
@UseGuards(SessionGuard)
@Query(() => User)
async me(@Context() ctx: GqlContext) {
  const session = ctx.req.session;
  return this.authGrpc.getUser({ userId: session.userId });
}
```

### Service Development (gRPC)

**Core Structure:**
```
services/feed-service/src/
├── feed/
│   ├── feed.grpc.controller.ts   # gRPC handlers
│   ├── feed.service.ts           # Business logic
│   └── feed.repository.ts        # MongoDB access
├── proto/
│   └── feed.proto                # gRPC definitions
├── common/
│   └── nats/                     # Event publishing
└── database/
    └── mongodb.module.ts
```

**Each service is independent:**
- Own database connection
- gRPC for incoming requests
- NATS for event publishing
- No direct HTTP calls to other services

### Transaction AOP

```typescript
// Service
@Transactional()  // Auto commit/rollback
async create(dto: CreatePostDto) {
  await this.postsRepo.create(dto);
  await this.tagsRepo.connect(post.id, dto.tags);
  return post;
}
```

**How it works:** Interceptor → AsyncLocalStorage → Auto commit/rollback

## Authentication System (CRITICAL)

### Session-Based Auth (Full BFF Pattern)

**Why Session-Based?**
- Tokens never exposed to browser (XSS protection)
- HttpOnly cookies prevent JavaScript access
- Server-side token storage
- IETF recommended pattern

### Multi-Provider Strategy Pattern

```typescript
// packages/types/src/auth/index.ts
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  // Future: KAKAO, NAVER, APPLE, GITHUB
}
```

**Adding New Provider (4 Steps):**
1. Add enum to `AuthProvider` in `packages/types`
2. Create strategy file: `[provider].strategy.ts`
3. Register in `auth.module.ts`
4. Add callback route in controller

### Time-Limited Domain Access

**Feature:** Grant temporary access to specific domains without full account access

```graphql
mutation {
  grantDomainAccess(
    domain: "resume.mygirok.dev"
    expiresInHours: 24
    recipientEmail: "recruiter@company.com"
  ) {
    accessToken
    expiresAt
    accessUrl
  }
}
```

## Frontend Development

### Web (React 19.2 + Vite)

```
apps/web-main/
├── src/
│   ├── pages/            # Page components
│   ├── components/       # UI components
│   ├── api/              # GraphQL client
│   ├── hooks/            # Custom hooks
│   └── stores/           # Zustand stores
└── vite.config.ts
```

**GraphQL Client Pattern:**
```typescript
// src/api/client.ts
const client = new ApolloClient({
  uri: import.meta.env.VITE_GRAPHQL_URL, // https://api.girok.dev/graphql
  credentials: 'include', // Send session cookie
  cache: new InMemoryCache(),
});
```

### Mobile Development (iOS/Android)

```swift
// iOS: Apollo iOS Client
let client = ApolloClient(
  url: URL(string: "https://api.girok.dev/graphql")!,
  configuration: URLSessionConfiguration.default
)
```

```kotlin
// Android: Apollo Kotlin Client
val apolloClient = ApolloClient.Builder()
  .serverUrl("https://api.girok.dev/graphql")
  .build()
```

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # Set DATABASE_URL, JWT_SECRET
cd services/auth-service && pnpm prisma migrate dev && pnpm prisma generate
pnpm dev  # All apps
```

## Development Workflow

### New Feature

1. Define types in `packages/types`
2. Update Prisma/MongoDB schema
3. Define Protobuf for gRPC
4. Create Repository
5. Create Service (use `@Transactional()` if needed)
6. Create gRPC Controller
7. Add resolver in GraphQL BFF
8. Frontend GraphQL query/mutation

### Type Sharing

```typescript
// DO: Import from shared types
import type { Post, CreatePostDto } from '@my-girok/types';

// DON'T: Duplicate definitions
```

## Git & Commit Policy (CRITICAL)

### Branch Strategy

- `main`: production-ready code
- `develop`: integration branch
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

**IMPORTANT: NEVER mention AI assistance in commit messages**

## Critical Rules

### Architecture (MUST FOLLOW)

1. **Full BFF Pattern**: All external requests go through GraphQL BFF
2. **Session-based auth**: Tokens stored server-side, HttpOnly cookies
3. **gRPC internal**: All service-to-service uses gRPC
4. **NATS events**: Async communication via JetStream
5. **Polyglot persistence**: Right database for each service
6. **Services are independent**: No direct HTTP calls between services

### When to Use Each Component

**Use GraphQL BFF when:**
- External client requests
- Need session management
- Query aggregation from multiple services
- Flexible field selection

**Use gRPC when:**
- Service-to-service communication
- High performance requirements
- Type-safe contracts

**Use NATS when:**
- Async event notifications
- Decoupled communication
- Event sourcing / CQRS

### Development Rules

**NEVER:**
1. Duplicate types → Use `packages/types`
2. Prisma in Controllers → Use Services
3. Hardcode env vars → Use ConfigService
4. Make HTTP calls between services → Use gRPC
5. Expose tokens to browser → Use session cookies
6. Skip error handling
7. Remove Rybbit analytics script
8. Write documentation in non-English
9. Commit secrets to git (use Sealed Secrets)
10. Log sensitive data (passwords, tokens)

**ALWAYS:**
1. Define types first in `packages/types`
2. Use DTO validation (class-validator)
3. Apply `@Transactional()` for multi-step DB operations
4. Use Guards for protected endpoints
5. Prevent N+1 queries
6. Write tests for new features (80% coverage)
7. Use gRPC for internal communication
8. Publish events to NATS for side effects

## Development Checklist

### New Backend Service
- [ ] Create service directory in `services/`
- [ ] Setup NestJS with gRPC
- [ ] Define Prisma/MongoDB schema
- [ ] Define Protobuf service
- [ ] Setup environment variables
- [ ] Implement health check endpoint
- [ ] Add NATS event publishing
- [ ] Add to docker-compose
- [ ] Write tests

### New Feature
- [ ] Types in `packages/types`
- [ ] Database schema + migration
- [ ] Protobuf definitions
- [ ] DTO validation (class-validator)
- [ ] Repository
- [ ] Service + `@Transactional()` if multi-step
- [ ] gRPC Controller
- [ ] GraphQL resolver in BFF
- [ ] Tests (80% coverage)

### Before Deployment
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] gRPC endpoints working
- [ ] GraphQL resolvers tested
- [ ] Health checks working (all services)
- [ ] Kubernetes manifests validated
- [ ] Sealed Secrets created
- [ ] Cilium Gateway routes configured

## Docs

### Frameworks
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [gRPC Node](https://grpc.io/docs/languages/node/)
- [NATS](https://docs.nats.io/)
- [Kubernetes](https://kubernetes.io/docs/)
- [Cilium Gateway API](https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/)

### Project Guidelines
- [SECURITY.md](SECURITY.md) - Security policies
- [TESTING.md](TESTING.md) - Testing standards
- [PERFORMANCE.md](PERFORMANCE.md) - Performance optimization
- [DEPLOYMENT.md](DEPLOYMENT.md) - Kubernetes deployment
