# Architecture

> Hybrid: REST + gRPC + GraphQL | Identity Platform | Event-Driven | **Last Updated**: 2026-01-11

## Identity Platform (3 Services, 3 DBs)

| Service          | REST | gRPC  | DB          |
| ---------------- | ---- | ----- | ----------- |
| identity-service | 3000 | 50051 | identity_db |
| auth-service     | 3001 | 50052 | auth_db     |
| legal-service    | 3005 | 50053 | legal_db    |

## Communication

| Direction             | Protocol  |
| --------------------- | --------- |
| Client → BFF          | GraphQL   |
| Client → Service      | REST      |
| BFF/Service → Service | gRPC      |
| Async Events          | Redpanda  |
| Real-time Updates     | WebSocket |

## Service Discovery (CoreDNS)

| Pattern  | Domain                | Use Case              |
| -------- | --------------------- | --------------------- |
| External | `grpc-dev.girok.dev`  | Developer gRPC access |
| Internal | `*.svc-dev.girok.dev` | Pod-to-Pod gRPC       |

> Multi-cluster ready: CoreDNS enables cross-cluster routing

## Architecture Layers

```
Cilium Gateway API
       │
   ┌───┴───┐
   ▼       ▼
GraphQL  REST  (BFF Layer)
   │ gRPC
   ▼
Identity Platform (identity/auth/legal)
   │ gRPC
   ▼
Domain Services (personal/feed/chat)
   │
   ▼
Redpanda (Kafka API, no JVM)
```

## Polyglot Persistence

| Type       | Services                        | Reason              |
| ---------- | ------------------------------- | ------------------- |
| PostgreSQL | identity, auth, legal, personal | ACID                |
| MongoDB    | feed, chat                      | Flexible/Throughput |
| ClickHouse | audit, analytics                | Analytics/Retention |
| Valkey     | matching                        | Realtime            |

## Real-time Communication

| Pattern   | Implementation       | Use Case              |
| --------- | -------------------- | --------------------- |
| WebSocket | @nestjs/platform-ws  | Live session updates  |
| Polling   | 5-second intervals   | Active session status |
| Gateway   | SessionRecordingsGWY | Broadcast to clients  |

**Path**: `/ws/sessions` (auth-bff)

## Resiliency Patterns

| Pattern         | Implementation | Use Case               |
| --------------- | -------------- | ---------------------- |
| Circuit Breaker | Custom class   | ClickHouse fault guard |
| Fallback        | Default values | Graceful degradation   |
| Retry           | Exponential    | Transient failures     |

**Thresholds**: 5 failures → open, 30s reset, 2 success → close

## ID Strategy

UUIDv7 (RFC 9562) - time-sortable, native UUID

**SSOT**: `docs/llm/architecture.md`
