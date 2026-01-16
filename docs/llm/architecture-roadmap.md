# Architecture 2025

## Communication Strategy

| Route              | Protocol       | Purpose           |
| ------------------ | -------------- | ----------------- |
| Client -> BFF      | GraphQL        | Flexible queries  |
| Client -> Service  | REST           | OAuth, simple API |
| BFF -> Service     | gRPC           | Internal          |
| Service -> Service | gRPC           | Internal          |
| Events             | NATS JetStream | Async events      |

## Service Ports

| Service      | REST  | gRPC   | Status      |
| ------------ | ----- | ------ | ----------- |
| GraphQL BFF  | :4000 | -      | Planned     |
| Auth Service | :3002 | :50051 | Implemented |
| Personal     | :3003 | :50052 | Implemented |
| Feed         | -     | :50053 | Planned     |
| Chat         | -     | :50054 | Planned     |
| Matching     | -     | :50055 | Planned     |
| Media        | -     | :50056 | Planned     |
| WS Gateway   | :3001 | -      | Planned     |
| LLM API      | :8000 | -      | Planned     |

## Current Status

| Service          | Status      | Technology       |
| ---------------- | ----------- | ---------------- |
| auth-service     | Implemented | NestJS, REST     |
| personal-service | Implemented | NestJS, REST     |
| web-girok        | Implemented | React 19.2, Vite |

## NATS JetStream

```yaml
AUTH:     subjects: ["auth.>"],     max_age: 7d
FEED:     subjects: ["feed.>"],     max_age: 30d
CHAT:     subjects: ["chat.>"],     max_age: 7d
MATCHING: subjects: ["matching.>"], max_age: 1d
```

Events:

```
auth.user.registered, auth.user.logged_in
feed.post.created, feed.post.liked
chat.message.sent, chat.room.created
matching.matched
```

## K8s Namespaces

```
gateway:       Cilium Gateway, GraphQL BFF, WS Gateway
services:      auth, personal, feed, chat, matching, media
data:          PostgreSQL, MongoDB, Valkey, NATS, MinIO
observability: Prometheus, Grafana, Jaeger
```

## Gateway Routes

```yaml
api.girok.dev   -> graphql-bff:4000
ws.girok.dev    -> ws-gateway:3001
auth.girok.dev  -> auth-service:3002
my.girok.dev    -> personal-service:3003
s3.girok.dev    -> minio:9000
```

## Proto Files

```
packages/proto/
  auth.proto, personal.proto, feed.proto
  chat.proto, matching.proto, media.proto, common.proto
```

## Tech Stack

| Category  | Technology                   |
| --------- | ---------------------------- |
| Gateway   | Cilium Gateway API           |
| BFF       | NestJS + Apollo Federation   |
| Auth      | Rust + Axum + Tonic (target) |
| Services  | NestJS + @grpc/grpc-js       |
| Database  | PostgreSQL, MongoDB, Valkey  |
| Event     | NATS JetStream               |
| Storage   | MinIO (S3)                   |
| WebSocket | Socket.io + Valkey Adapter   |
| Frontend  | React 19.2, iOS, Android     |
