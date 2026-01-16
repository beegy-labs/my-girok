# 아키텍처 로드맵 2025

> 플랫폼 아키텍처 및 통신 전략

## 통신 전략

| 경로              | 프로토콜       | 목적                   |
| ----------------- | -------------- | ---------------------- |
| Client → BFF      | GraphQL        | 유연한 클라이언트 쿼리 |
| Client → Service  | REST           | OAuth 흐름, 단순 API   |
| BFF → Service     | gRPC           | 내부 고성능            |
| Service → Service | gRPC           | 내부 통신              |
| Events            | NATS JetStream | 비동기 메시징          |

## 서비스 포트

| 서비스           | REST  | gRPC   | 상태      |
| ---------------- | ----- | ------ | --------- |
| GraphQL BFF      | :4000 | -      | 계획 중   |
| Auth Service     | :3001 | :50052 | 구현 완료 |
| Identity Service | :3005 | :50051 | 구현 완료 |
| Legal Service    | :3006 | :50053 | 구현 완료 |
| Personal Service | :4002 | -      | 구현 완료 |
| Feed Service     | -     | :50054 | 계획 중   |
| Chat Service     | -     | :50055 | 계획 중   |
| Matching Service | -     | :50056 | 계획 중   |
| Media Service    | -     | :50057 | 계획 중   |
| WS Gateway       | :3002 | -      | 계획 중   |
| LLM API          | :8000 | -      | 계획 중   |

## 현재 구현 상태

| 서비스           | 상태      | 기술                 |
| ---------------- | --------- | -------------------- |
| auth-service     | 구현 완료 | NestJS, REST         |
| identity-service | 구현 완료 | NestJS, REST + gRPC  |
| legal-service    | 구현 완료 | NestJS, REST + gRPC  |
| personal-service | 구현 완료 | NestJS, REST         |
| web-girok        | 구현 완료 | React 19.2, Vite 7.2 |

## NATS JetStream 설정

스트림 정의:

```yaml
AUTH:     subjects: ["auth.>"],     max_age: 7d
FEED:     subjects: ["feed.>"],     max_age: 30d
CHAT:     subjects: ["chat.>"],     max_age: 7d
MATCHING: subjects: ["matching.>"], max_age: 1d
```

이벤트 주제:

- `auth.user.registered` - 사용자 등록 완료
- `auth.user.logged_in` - 사용자 로그인 이벤트
- `feed.post.created` - 새 게시물 생성
- `feed.post.liked` - 게시물 좋아요
- `chat.message.sent` - 채팅 메시지 전송
- `chat.room.created` - 채팅 방 생성
- `matching.matched` - 사용자 매칭

## 쿠버네티스 네임스페이스

```
gateway:       Cilium Gateway, GraphQL BFF, WS Gateway
services:      auth, identity, legal, personal, feed, chat, matching, media
data:          PostgreSQL, MongoDB, Valkey, NATS, MinIO
observability: Prometheus, Grafana, Jaeger
```

## 게이트웨이 라우트

```yaml
api.girok.dev   -> graphql-bff:4000
ws.girok.dev    -> ws-gateway:3002
auth.girok.dev  -> auth-service:3001
my.girok.dev    -> personal-service:4002
s3.girok.dev    -> minio:9000
```

## 프로토 파일

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

## 기술 스택

| 카테고리  | 기술                                      |
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

**LLM 참조**: `docs/llm/ARCHITECTURE_ROADMAP.md`
