# Architecture (2025)

> Hybrid: REST + gRPC + GraphQL | Event-Driven

## Communication Strategy

| Direction         | Protocol       | Use Case                   |
| ----------------- | -------------- | -------------------------- |
| Client → BFF      | GraphQL        | Main API, flexible queries |
| Client → Service  | REST           | OAuth, simple APIs         |
| BFF → Service     | gRPC           | High-performance internal  |
| Service → Service | gRPC           | Internal communication     |
| Async Events      | NATS JetStream | Decoupled messaging        |

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   Cilium Gateway API                         │
│         (TLS, L7 routing, rate limiting, autoscaling)        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ GraphQL BFF  │     │ Auth Service │     │ WS Gateway   │
│  (Session)   │     │ (REST+gRPC)  │     │ (Socket.io)  │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │ gRPC
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Domain Services (gRPC + Database)               │
│  Personal(PG)  Feed(Mongo)  Chat(Mongo)  Matching(Valkey)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
               ┌─────────────────────────┐
               │    NATS JetStream       │
               │     (Async Events)      │
               └─────────────────────────┘
```

## Full BFF Pattern (IETF)

```typescript
// Session-based auth - tokens NEVER exposed to browser
ctx.res.cookie('session_id', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

## Project Structure

```
my-girok/
├── apps/web-main/           # React 19.2 + Vite ✅
├── services/
│   ├── auth-service/        # REST ✅ | gRPC 🔲
│   ├── personal-service/    # REST ✅ | gRPC 🔲
│   ├── graphql-bff/         # 🔲 Federation
│   └── ws-gateway/          # 🔲 Socket.io
└── packages/
    ├── types/               # ✅ Shared types
    └── nest-common/         # ✅ NestJS utilities
```

## Polyglot Persistence

| Service          | Database   | Reason                |
| ---------------- | ---------- | --------------------- |
| auth-service     | PostgreSQL | ACID, relations       |
| personal-service | PostgreSQL | Complex queries       |
| feed-service     | MongoDB    | Flexible schema       |
| chat-service     | MongoDB    | High write throughput |
| matching-service | Valkey     | In-memory, real-time  |

## NATS Events

```typescript
// Publish
await this.nats.publish('user.created', { userId, email });

// Subscribe
@NatsSubscribe('user.created')
async handleUserCreated(data: UserCreatedEvent) { }
```

## Service Communication

```typescript
// DO: gRPC call
const user = await this.authGrpcClient.getUser({ userId });

// DO: Event publish
await this.nats.publish('post.created', { postId });

// DON'T: Direct import
import { AuthService } from '../auth-service'; // NEVER
```

## URL Mapping

| URL                   | Service      | Status |
| --------------------- | ------------ | ------ |
| my.girok.dev          | web-main     | ✅     |
| api.girok.dev/graphql | graphql-bff  | 🔲     |
| auth.girok.dev        | auth-service | ✅     |
| ws.girok.dev          | ws-gateway   | 🔲     |

---

**Full roadmap**: `docs/ARCHITECTURE_ROADMAP.md`
