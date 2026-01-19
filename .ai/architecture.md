# Architecture

> Hybrid: REST + gRPC + GraphQL | Identity Platform | Event-Driven | **Last Updated**: 2026-01-11

## Identity Platform

| Service          | REST | gRPC  | DB          |
| ---------------- | ---- | ----- | ----------- |
| identity-service | 3000 | 50051 | identity_db |
| auth-service     | 3002 | 50052 | auth_db     |
| legal-service    | 3005 | 50053 | legal_db    |

## Communication

| Direction             | Protocol                   |
| --------------------- | -------------------------- |
| Client → BFF          | GraphQL                    |
| Client → Service      | REST                       |
| BFF/Service → Service | gRPC                       |
| Async Events          | Redpanda                   |
| Real-time             | WebSocket (`/ws/sessions`) |

## Service Discovery (CoreDNS)

| Pattern  | Domain                | Use Case        |
| -------- | --------------------- | --------------- |
| External | `grpc-dev.girok.dev`  | Developer gRPC  |
| Internal | `*.svc-dev.girok.dev` | Pod-to-Pod gRPC |

## Persistence

| Type       | Services                        | Reason              |
| ---------- | ------------------------------- | ------------------- |
| PostgreSQL | identity, auth, legal, personal | ACID                |
| MongoDB    | feed, chat                      | Flexible/Throughput |
| ClickHouse | audit, analytics                | Analytics/Retention |
| Valkey     | matching                        | Realtime            |

## Resiliency

| Pattern         | Implementation | Thresholds                   |
| --------------- | -------------- | ---------------------------- |
| Circuit Breaker | Custom class   | 5 failures → open, 30s reset |
| Fallback        | Default values | Graceful degradation         |
| Retry           | Exponential    | Transient failures           |

**ID Strategy**: UUIDv7 (RFC 9562) - time-sortable

**SSOT**: `docs/llm/architecture.md`
