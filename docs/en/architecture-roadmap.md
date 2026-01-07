# Architecture Roadmap 2025

> Platform architecture and communication strategy

## Communication Strategy

| Route             | Protocol       | Purpose                   |
| ----------------- | -------------- | ------------------------- |
| Client → BFF      | GraphQL        | Flexible client queries   |
| Client → Service  | REST           | OAuth flows, simple APIs  |
| BFF → Service     | gRPC           | Internal high-performance |
| Service → Service | gRPC           | Internal communication    |
| Events            | NATS JetStream | Asynchronous messaging    |

## Service Ports

| Service          | REST  | gRPC   | Status      |
| ---------------- | ----- | ------ | ----------- |
| GraphQL BFF      | :4000 | -      | Planned     |
| Auth Service     | :3001 | :50052 | Implemented |
| Identity Service | :3005 | :50051 | Implemented |
| Legal Service    | :3006 | :50053 | Implemented |
| Personal Service | :4002 | -      | Implemented |
| Feed Service     | -     | :50054 | Planned     |
| Chat Service     | -     | :50055 | Planned     |
| Matching Service | -     | :50056 | Planned     |
| Media Service    | -     | :50057 | Planned     |
| WS Gateway       | :3002 | -      | Planned     |
| LLM API          | :8000 | -      | Planned     |

## Current Implementation Status

| Service          | Status      | Technology           |
| ---------------- | ----------- | -------------------- |
| auth-service     | Implemented | NestJS, REST         |
| identity-service | Implemented | NestJS, REST + gRPC  |
| legal-service    | Implemented | NestJS, REST + gRPC  |
| personal-service | Implemented | NestJS, REST         |
| web-main         | Implemented | React 19.2, Vite 7.2 |

## NATS JetStream Configuration

Stream definitions:

```yaml
AUTH:     subjects: ["auth.>"],     max_age: 7d
FEED:     subjects: ["feed.>"],     max_age: 30d
CHAT:     subjects: ["chat.>"],     max_age: 7d
MATCHING: subjects: ["matching.>"], max_age: 1d
```

Event subjects:

- `auth.user.registered` - User registration completed
- `auth.user.logged_in` - User login event
- `feed.post.created` - New post created
- `feed.post.liked` - Post liked by user
- `chat.message.sent` - Chat message sent
- `chat.room.created` - Chat room created
- `matching.matched` - Users matched

## Kubernetes Namespaces

```
gateway:       Cilium Gateway, GraphQL BFF, WS Gateway
services:      auth, identity, legal, personal, feed, chat, matching, media
data:          PostgreSQL, MongoDB, Valkey, NATS, MinIO
observability: Prometheus, Grafana, Jaeger
```

## Gateway Routes

```yaml
api.girok.dev   -> graphql-bff:4000
ws.girok.dev    -> ws-gateway:3002
auth.girok.dev  -> auth-service:3001
my.girok.dev    -> personal-service:4002
s3.girok.dev    -> minio:9000
```

## Proto Files

```
packages/proto/
├── auth.proto
├── identity.proto
├── legal.proto
├── personal.proto
├── feed.proto
├── chat.proto
├── matching.proto
├── media.proto
└── common.proto
```

## Technology Stack

| Category  | Technology                                |
| --------- | ----------------------------------------- |
| Gateway   | Cilium Gateway API                        |
| BFF       | NestJS + Apollo Federation                |
| Auth      | NestJS (future: Rust + Axum + Tonic)      |
| Services  | NestJS + @grpc/grpc-js                    |
| Databases | PostgreSQL, MongoDB, Valkey               |
| Events    | NATS JetStream                            |
| Storage   | MinIO (S3-compatible)                     |
| WebSocket | Socket.io + Valkey Adapter                |
| Frontend  | React 19.2, iOS (Swift), Android (Kotlin) |

---

**LLM Reference**: `docs/llm/ARCHITECTURE_ROADMAP.md`
