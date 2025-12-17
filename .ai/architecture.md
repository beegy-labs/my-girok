# Architecture Patterns (2025)

> **Hybrid Communication: REST + gRPC + GraphQL | Event-Driven Architecture**

## Confirmed Communication Strategy

| Direction | Protocol | Use Case |
|-----------|----------|----------|
| **Client → BFF** | GraphQL | Main API, flexible queries |
| **Client → Service** | REST | OAuth callbacks, simple APIs |
| **BFF → Service** | gRPC | Internal high-performance |
| **Service → Service** | gRPC | Internal communication |
| **Async Events** | NATS JetStream | Decoupled messaging |

## Core Principle

**Layered architecture with clear separation:**
- **Edge Layer**: Cilium Gateway API (TLS, L7 routing, autoscaling)
- **BFF Layer**: GraphQL Federation (authentication, session, aggregation)
- **Service Layer**: Domain microservices (gRPC internal, REST external)
- **Data Layer**: Polyglot persistence (PostgreSQL, MongoDB, Valkey)
- **Messaging Layer**: NATS JetStream (events, async communication)

## Tech Stack (Extensible)

> **Note**: Tech stack is designed to be extensible. New languages/frameworks can be added as needed.

| Category | Current | Planned/Extensible |
|----------|---------|-------------------|
| **Backend** | NestJS (TypeScript) | Rust, Python, Go, ... |
| **Frontend** | React 19.2 + Vite | Next.js, Swift, Kotlin, Flutter, ... |
| **Database** | PostgreSQL, Valkey | MongoDB, ClickHouse, ... |
| **AI/ML** | - | Python (FastAPI, LangChain), ... |
| **Protocol** | REST | gRPC, GraphQL, WebSocket, ... |

**Language per Service (Polyglot):**
- **auth-service**: NestJS → Rust (planned)
- **personal-service**: NestJS
- **feed-service**: NestJS (planned)
- **chat-service**: NestJS (planned)
- **llm-api**: Python FastAPI (planned)
- **...**

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Cilium Gateway API                             │
│                (TLS Termination, L7 Routing)                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ my.girok.dev │ api.girok.dev │ auth.girok.dev │ ws.girok.dev   ││
│  │   (Web SPA)  │ (GraphQL BFF) │  (Auth REST)   │  (WebSocket)   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────┬──────────────┬──────────────┬──────────────┬──────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
   ┌────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  Web Main  │ │ GraphQL BFF │ │Auth Service │ │     WS      │
   │   (SPA)    │ │   (NestJS)  │ │(REST+gRPC)  │ │   Gateway   │
   │    ✅      │ │    🔲       │ │  REST: ✅   │ │     🔲      │
   └────────────┘ └──────┬──────┘ │  gRPC: 🔲   │ └──────┬──────┘
                         │        └─────────────┘        │
                         │ gRPC (Internal Communication) │
   ┌─────────────────────┼───────────────────────────────┼──────────┐
   │                     ▼                               ▼          │
   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
   │  │ Personal │  │   Feed   │  │   Chat   │  │ Matching │  ...  │
   │  │ Service  │  │ Service  │  │ Service  │  │ Service  │       │
   │  │ REST: ✅ │  │   🔲     │  │    🔲    │  │    🔲    │       │
   │  │ gRPC: 🔲 │  │          │  │          │  │          │       │
   │  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤       │
   │  │PostgreSQL│  │ MongoDB  │  │ MongoDB  │  │  Valkey  │       │
   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
   └───────────────────────────────┬────────────────────────────────┘
                                   │
                       ┌───────────────────────┐
                       │    NATS JetStream     │
                       │    (Async Events)     │
                       └───────────────────────┘

✅ = Implemented | 🔲 = Planned
```

## Project Structure

```
my-girok/
├── apps/                        # Client Applications
│   ├── web-main/               # ✅ React 19.2 + Vite
│   ├── web-admin/              # 🔲 Admin dashboard
│   ├── ios/                    # 🔲 Swift iOS app
│   └── android/                # 🔲 Kotlin Android app
│
├── services/                    # ✅ = Implemented, 🔲 = Planned
│   ├── gateway/
│   │   ├── graphql-bff/        # 🔲 GraphQL Federation (NestJS)
│   │   └── ws-gateway/         # 🔲 WebSocket (Socket.io)
│   │
│   ├── auth-service/           # ✅ REST | 🔲 gRPC (→ Rust planned)
│   ├── personal-service/       # ✅ REST | 🔲 gRPC
│   ├── feed-service/           # 🔲 gRPC + MongoDB
│   ├── chat-service/           # 🔲 gRPC + MongoDB
│   ├── matching-service/       # 🔲 gRPC + Valkey
│   ├── media-service/          # 🔲 gRPC + MinIO
│   └── llm-api/                # 🔲 Python FastAPI
│
├── packages/                    # Shared Packages
│   ├── types/                  # ✅ TypeScript types
│   ├── nest-common/            # ✅ NestJS utilities
│   ├── ui-components/          # 🔲 React components
│   └── proto/                  # 🔲 Protobuf definitions
│
└── k8s/                         # Kubernetes manifests
    ├── base/                   # Kustomize base
    └── overlays/               # staging, production
```

> **Note**: New services/apps can be added as the project grows. This structure is not fixed.

## Layer Responsibilities

### 1. Edge Layer: Cilium Gateway API

**Responsibilities:**
- TLS termination (cert-manager)
- L7 HTTP routing (HTTPRoute)
- Rate limiting (CiliumNetworkPolicy)
- Autoscaling (HPA triggers)
- mTLS between pods (Cilium encryption)

**What it does NOT do:**
- Authentication (delegated to BFF)
- Session management (delegated to BFF)

```yaml
# HTTPRoute Example
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
spec:
  parentRefs:
    - name: girok-gateway
  hostnames:
    - "api.girok.dev"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /graphql
      backendRefs:
        - name: graphql-bff
          port: 4000
```

### 2. BFF Layer: GraphQL Federation

**Full BFF Pattern (IETF Recommended):**
- Session cookies (HttpOnly, Secure, SameSite=Strict)
- Tokens NEVER exposed to browser JavaScript
- Backend handles token refresh automatically

```typescript
// GraphQL BFF handles ALL authentication
@Resolver()
export class AuthResolver {
  @Mutation(() => AuthResponse)
  async login(
    @Args('input') input: LoginInput,
    @Context() ctx: GqlContext,
  ) {
    // 1. Validate credentials via gRPC
    const tokens = await this.authClient.login(input);

    // 2. Store session in Valkey
    const sessionId = await this.sessionService.create(tokens);

    // 3. Set HttpOnly cookie (token never in response body)
    ctx.res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { success: true };
  }
}
```

**GraphQL Federation:**
- Single endpoint: `api.girok.dev/graphql`
- Federated subgraphs per domain
- Query planning and optimization

### 3. Service Layer: Domain Microservices

**Communication Protocols (Hybrid Strategy):**
| Direction | Protocol | Use Case |
|-----------|----------|----------|
| Client → BFF | GraphQL | Main API, flexible queries |
| Client → Service | REST | OAuth callbacks, simple APIs, health checks |
| BFF → Service | gRPC | High performance, type-safe |
| Service → Service | gRPC | Internal communication |

**Why Hybrid?**
- REST for external-facing APIs (OAuth, webhooks) - browser/ecosystem compatibility
- gRPC for internal communication - 3-10x faster, type-safe, streaming
- GraphQL for client aggregation - flexible queries, single endpoint

**gRPC Service Example:**
```protobuf
// proto/auth.proto
service AuthService {
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc ValidateToken(ValidateRequest) returns (ValidateResponse);
  rpc RefreshToken(RefreshRequest) returns (RefreshResponse);
  rpc GetUser(GetUserRequest) returns (User);
}
```

### 4. Data Layer: Polyglot Persistence

| Service | Database | Reason |
|---------|----------|--------|
| auth-service | PostgreSQL | ACID, relations |
| personal-service | PostgreSQL | ACID, complex queries |
| feed-service | MongoDB | Flexible schema, timeline |
| chat-service | MongoDB | High write throughput |
| matching-service | Valkey | In-memory, real-time |

### 5. Messaging Layer: NATS JetStream

**Event-Driven Patterns:**
- Event Sourcing for audit trail
- CQRS for read/write separation
- Pub/Sub for real-time updates

```typescript
// Publishing events
await this.nats.publish('user.created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
});

// Subscribing to events
@NatsSubscribe('user.created')
async handleUserCreated(data: UserCreatedEvent) {
  await this.feedService.initializeTimeline(data.userId);
}
```

## Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│ Browser │────▶│ GraphQL BFF │────▶│ Auth Service│────▶│   PG    │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
     │                │                    │
     │  1. Login      │                    │
     │  (email/pass)  │                    │
     │───────────────▶│                    │
     │                │  2. gRPC Login     │
     │                │───────────────────▶│
     │                │                    │ 3. Validate
     │                │                    │───────────▶
     │                │  4. JWT tokens     │
     │                │◀───────────────────│
     │                │                    │
     │                │  5. Create session │
     │                │     in Valkey      │
     │                │                    │
     │  6. HttpOnly   │                    │
     │     cookie     │                    │
     │◀───────────────│                    │
     │                │                    │
     │  7. GraphQL    │                    │
     │     requests   │                    │
     │  (with cookie) │                    │
     │───────────────▶│  8. Validate       │
     │                │     session        │
     │                │───────────────────▶│
```

## WebSocket Architecture

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ Browser │────▶│ WS Gateway  │────▶│   Valkey    │
│(Socket.io)    │ (Socket.io) │     │  (Adapter)  │
└─────────┘     └─────────────┘     └─────────────┘
                      │
                      │ Subscribe
                      ▼
              ┌─────────────┐
              │    NATS     │
              │  JetStream  │
              └─────────────┘
                      ▲
                      │ Publish
         ┌────────────┼────────────┐
         │            │            │
    ┌────────┐  ┌──────────┐  ┌─────────┐
    │  Feed  │  │   Chat   │  │ Matching│
    │Service │  │  Service │  │ Service │
    └────────┘  └──────────┘  └─────────┘
```

**Socket.io Namespaces:**
- `/feed` - Timeline updates
- `/chat` - Direct messages
- `/matching` - Random chat matching
- `/notifications` - System notifications

## Service Communication

**Rules:**
- Services NEVER import each other directly
- Use gRPC for sync calls
- Use NATS for async events
- Each service owns its database

```typescript
// DO: gRPC call
async getUser(userId: string): Promise<User> {
  return this.authGrpcClient.getUser({ userId });
}

// DO: Event publish
await this.nats.publish('post.created', { postId, authorId });

// DON'T: Direct import
import { AuthService } from '../auth-service'; // NEVER
```

## Real-World Examples

### Feed Timeline Query

```graphql
query {
  timeline(limit: 20, cursor: "abc123") {
    posts {
      id
      content
      author {
        id
        name
        avatar
      }
      likes
      comments(limit: 3) {
        content
        author { name }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Internal Flow:**
1. GraphQL BFF receives query
2. BFF calls feed-service via gRPC (posts)
3. BFF calls auth-service via gRPC (author data)
4. BFF aggregates and returns single response

### Chat Message Flow

```
1. User sends message via Socket.io
2. WS Gateway validates session (Valkey)
3. WS Gateway calls chat-service via gRPC
4. Chat-service stores in MongoDB
5. Chat-service publishes to NATS
6. WS Gateway receives NATS event
7. WS Gateway broadcasts to room members
```

## K8s Namespace Structure

```
cilium-gateway/     # Gateway, HTTPRoute, TLS
dev-my-girok/       # Application services
storage/            # Valkey instances
minio-tenant/       # Object storage
vault/              # Secrets management
monitoring/         # Prometheus, Loki, Grafana
messaging/          # NATS JetStream
databases/          # MongoDB clusters
realtime/           # LiveKit SFU
```

## URL Mapping

| URL | Service | Protocol | Status |
|-----|---------|----------|--------|
| `my.girok.dev` | web-main | SPA (static) | ✅ |
| `api.girok.dev/graphql` | graphql-bff | GraphQL | 🔲 |
| `auth.girok.dev` | auth-service | REST | ✅ |
| `ws.girok.dev` | ws-gateway | WebSocket | 🔲 |
| `s3.girok.dev` | minio | S3 | ✅ |

## Shared Packages Usage

### @my-girok/nest-common

```typescript
import {
  configureApp,
  JwtAuthGuard,
  GrpcClientFactory,
  NatsPublisher,
} from '@my-girok/nest-common';

const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'Feed Service',
  grpc: { enabled: true, port: 50051 },
  nats: { enabled: true },
});
```

### @my-girok/proto

```typescript
import {
  AuthServiceClient,
  FeedServiceClient,
} from '@my-girok/proto';

// Type-safe gRPC clients
const user = await authClient.getUser({ userId });
const posts = await feedClient.getTimeline({ userId, limit: 20 });
```

## When to Use Each Pattern

### Use GraphQL When:
- Complex nested data requirements
- Multiple services need to be aggregated
- Client needs flexible field selection

### Use gRPC When:
- Service-to-service communication
- High performance required (10x faster than REST)
- Type safety is critical

### Use NATS When:
- Async operations (email, notifications)
- Event sourcing (audit trail)
- Cross-service data sync

### Use WebSocket When:
- Real-time updates required
- Chat, notifications, live feed
- Bidirectional communication

## Key Takeaways

1. **Hybrid Communication** - REST (external) + gRPC (internal) + GraphQL (BFF)
2. **Full BFF Pattern** - Session-based auth, tokens never exposed to browser
3. **GraphQL Federation** - Single endpoint, federated subgraphs (planned)
4. **gRPC Internal** - Type-safe, high-performance service calls
5. **NATS Events** - Async communication, event sourcing
6. **Polyglot Persistence** - Right database for each domain
7. **Extensible Stack** - New languages/frameworks can be added (Rust, Python, Go, ...)
8. **Cilium Gateway** - TLS, routing at edge

**For specific service APIs, see `.ai/services/`**
**For detailed architecture roadmap, see `docs/ARCHITECTURE_ROADMAP.md`**
