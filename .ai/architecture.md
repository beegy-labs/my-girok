# Architecture

> Hybrid: REST + gRPC + GraphQL | Identity Platform | Event-Driven | **Last Updated**: 2026-01-11

## Identity Platform (3 Services, 3 DBs)

| Service          | REST | gRPC  | DB          |
| ---------------- | ---- | ----- | ----------- |
| identity-service | 3000 | 50051 | identity_db |
| auth-service     | 3001 | 50052 | auth_db     |
| legal-service    | 3005 | 50053 | legal_db    |

## Communication

| Direction             | Protocol |
| --------------------- | -------- |
| Client → BFF          | GraphQL  |
| Client → Service      | REST     |
| BFF/Service → Service | gRPC     |
| Async Events          | Redpanda |

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

## ID Strategy

UUIDv7 (RFC 9562) - time-sortable, native UUID

**SSOT**: `docs/llm/architecture.md`
