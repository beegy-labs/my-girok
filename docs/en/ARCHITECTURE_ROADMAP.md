# Architecture 2025 (Final)

> Final architecture design document

## Communication Strategy

### Hybrid (REST + gRPC + GraphQL)

| Route                 | Protocol       | Purpose                    |
| --------------------- | -------------- | -------------------------- |
| **Client → BFF**      | GraphQL        | Main API, flexible queries |
| **Client → Service**  | REST           | OAuth callback, simple API |
| **BFF → Service**     | gRPC           | Internal communication     |
| **Service → Service** | gRPC           | Internal communication     |
| **Event**             | NATS JetStream | Async events               |

---

## Overall Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│                    (Web, iOS, Android)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │ GraphQL        │ REST           │
         ▼                ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ GraphQL BFF │    │Auth Service │    │   MinIO     │
│  (NestJS)   │    │   (Rust)    │    │   (S3)      │
│   :4000     │    │ REST :3002  │    │   :9000     │
└──────┬──────┘    └─────────────┘    └─────────────┘
       │
       │ gRPC (internal)
       │
┌──────┴──────────────────────────────────────────────────────┐
│                      Domain Services                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Auth    │  │ Personal │  │   Feed   │  │   Chat   │    │
│  │  (Rust)  │  │ (NestJS) │  │ (NestJS) │  │ (NestJS) │    │
│  │ gRPC     │  │ gRPC     │  │ gRPC     │  │ gRPC     │    │
│  │ :50051   │  │ :50052   │  │ :50053   │  │ :50054   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐                                 │
│  │ Matching │  │  Media   │                                 │
│  │ (NestJS) │  │ (NestJS) │                                 │
│  │ gRPC     │  │ gRPC     │                                 │
│  │ :50055   │  │ :50056   │                                 │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    NATS JetStream                            │
│                (Event-based async communication)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

| Service          | Status         | Technology       |
| ---------------- | -------------- | ---------------- |
| auth-service     | ✅ Implemented | NestJS, REST     |
| personal-service | ✅ Implemented | NestJS, REST     |
| web-main         | ✅ Implemented | React 19.2, Vite |

---

## Service Details

### 1. Auth Service

**Current:** NestJS + REST
**Target:** Rust + REST + gRPC

| Port   | Protocol | Purpose                                  |
| ------ | -------- | ---------------------------------------- |
| :3002  | REST     | External (OAuth, login, profile)         |
| :50051 | gRPC     | Internal (token validation, user lookup) |

**REST API (External - maintain):**

```
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/auth/google
GET    /v1/auth/google/callback
GET    /v1/auth/kakao
GET    /v1/auth/kakao/callback
GET    /v1/auth/naver
GET    /v1/auth/naver/callback
GET    /v1/users/me
PATCH  /v1/users/me
POST   /v1/users/me/change-password
```

**gRPC API (Internal - planned):**

```protobuf
service AuthService {
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetUser(GetUserRequest) returns (User);
  rpc GetUserByUsername(GetUserByUsernameRequest) returns (User);
  rpc GetUsersByIds(GetUsersByIdsRequest) returns (UsersResponse);
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc Register(RegisterRequest) returns (RegisterResponse);
}
```

**Target Stack:**

- Rust + Axum (REST)
- Rust + Tonic (gRPC)
- PostgreSQL + SQLx
- JWT + bcrypt

---

### 2. Personal Service

**Current:** NestJS + REST
**Target:** NestJS + REST + gRPC

| Port   | Protocol | Purpose                    |
| ------ | -------- | -------------------------- |
| :3003  | REST     | External (public profile)  |
| :50052 | gRPC     | Internal (BFF integration) |

**gRPC API (planned):**

```protobuf
service PersonalService {
  rpc GetResume(GetResumeRequest) returns (Resume);
  rpc GetResumesByUserId(GetResumesByUserIdRequest) returns (ResumesResponse);
  rpc GetPublicResume(GetPublicResumeRequest) returns (Resume);
  rpc CreateResume(CreateResumeRequest) returns (Resume);
  rpc UpdateResume(UpdateResumeRequest) returns (Resume);
}
```

---

### 3. GraphQL BFF (Not Implemented)

**Role:** Single entry point for clients, session management

| Port  | Protocol    | Purpose                |
| ----- | ----------- | ---------------------- |
| :4000 | GraphQL     | External (client)      |
| -     | gRPC Client | Internal service calls |

**Core Design:**

```typescript
// Session-based auth (Full BFF Pattern)
@Mutation(() => AuthResponse)
async login(@Args('input') input: LoginInput, @Context() ctx: GqlContext) {
  // 1. Auth Service gRPC call
  const tokens = await this.authGrpc.login(input);

  // 2. Create session (server-side token storage)
  const sessionId = await this.sessionService.create({
    userId: tokens.userId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  // 3. Set HttpOnly cookie (no token exposure)
  ctx.res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return { success: true };
}
```

---

### 4. WebSocket Gateway (Not Implemented)

**Role:** Real-time events

| Port  | Protocol  | Purpose           |
| ----- | --------- | ----------------- |
| :3001 | WebSocket | External (client) |

**Namespaces:**

```
/chat          → Chat messages
/feed          → Feed updates
/notifications → Notifications
/matching      → Matching status
```

**Stack:**

- NestJS 11 + Socket.io
- Valkey Adapter (Pod broadcasting)
- NATS subscription → Client push

---

### 5. Feed Service (Not Implemented)

| Port   | Protocol |
| ------ | -------- |
| :50053 | gRPC     |

**gRPC API:**

```protobuf
service FeedService {
  rpc GetTimeline(GetTimelineRequest) returns (TimelineResponse);
  rpc CreatePost(CreatePostRequest) returns (Post);
  rpc GetPost(GetPostRequest) returns (Post);
  rpc LikePost(LikePostRequest) returns (LikeResponse);
}
```

**Stack:** NestJS + MongoDB + Fan-out on Write

---

### 6. Chat Service (Not Implemented)

| Port   | Protocol |
| ------ | -------- |
| :50054 | gRPC     |

**gRPC API:**

```protobuf
service ChatService {
  rpc GetRooms(GetRoomsRequest) returns (RoomsResponse);
  rpc GetMessages(GetMessagesRequest) returns (MessagesResponse);
  rpc SendMessage(SendMessageRequest) returns (Message);
  rpc CreateRoom(CreateRoomRequest) returns (Room);
}
```

**Stack:** NestJS + MongoDB + TTL Index

---

### 7. Matching Service (Not Implemented)

| Port   | Protocol |
| ------ | -------- |
| :50055 | gRPC     |

**gRPC API:**

```protobuf
service MatchingService {
  rpc JoinQueue(JoinQueueRequest) returns (QueueResponse);
  rpc LeaveQueue(LeaveQueueRequest) returns (Empty);
  rpc SkipUser(SkipUserRequest) returns (Empty);
}
```

**Stack:** NestJS + Valkey (Sorted Set)

---

### 8. Media Service (Not Implemented)

| Port   | Protocol |
| ------ | -------- |
| :50056 | gRPC     |

**gRPC API:**

```protobuf
service MediaService {
  rpc GetUploadUrl(GetUploadUrlRequest) returns (UploadUrlResponse);
  rpc ProcessImage(ProcessImageRequest) returns (ProcessedImageResponse);
  rpc DeleteFile(DeleteFileRequest) returns (Empty);
}
```

**Stack:** NestJS + MinIO + Sharp + BullMQ

---

### 9. LLM API (Not Implemented)

| Port  | Protocol |
| ----- | -------- |
| :8000 | REST     |

**Stack:** Python 3.13 + FastAPI + LangChain

---

## NATS JetStream Events

### Stream Design

```yaml
AUTH:     subjects: ["auth.>"],     max_age: 7d
FEED:     subjects: ["feed.>"],     max_age: 30d
CHAT:     subjects: ["chat.>"],     max_age: 7d
MATCHING: subjects: ["matching.>"], max_age: 1d
```

### Event List

```
auth.user.registered  → Create default data
auth.user.logged_in   → Activity log
feed.post.created     → Timeline fan-out, WS broadcast
feed.post.liked       → Notification, counter update
chat.message.sent     → WS broadcast
chat.room.created     → Participant notification
matching.matched      → Create room, WS notification
```

---

## Kubernetes Structure

### Namespaces

```
gateway:       Cilium Gateway, GraphQL BFF, WS Gateway
services:      auth, personal, feed, chat, matching, media
data:          PostgreSQL, MongoDB, Valkey, NATS, MinIO
observability: Prometheus, Grafana, Jaeger
```

### Cilium Gateway API

```yaml
api.girok.dev   → graphql-bff:4000
ws.girok.dev    → ws-gateway:3001
auth.girok.dev  → auth-service:3002
my.girok.dev    → personal-service:3003
s3.girok.dev    → minio:9000
```

---

## Proto File Location

```
packages/proto/
├── auth.proto
├── personal.proto
├── feed.proto
├── chat.proto
├── matching.proto
├── media.proto
└── common.proto
```

---

## Implementation Priority

| Order | Service          | Current Status     | Next Action           |
| ----- | ---------------- | ------------------ | --------------------- |
| 1     | auth-service     | NestJS implemented | Rust + gRPC migration |
| 2     | personal-service | NestJS implemented | Add gRPC              |
| 3     | graphql-bff      | Not implemented    | New development       |
| 4     | ws-gateway       | Not implemented    | New development       |
| 5     | feed-service     | Not implemented    | New development       |
| 6     | chat-service     | Not implemented    | New development       |
| 7     | matching-service | Not implemented    | New development       |
| 8     | media-service    | Not implemented    | New development       |
| 9     | llm-api          | Not implemented    | New development       |

---

## Tech Stack Summary

| Category      | Technology                                |
| ------------- | ----------------------------------------- |
| **Gateway**   | Cilium Gateway API                        |
| **BFF**       | NestJS + Apollo Federation                |
| **Auth**      | Rust + Axum + Tonic                       |
| **Services**  | NestJS + @grpc/grpc-js                    |
| **Database**  | PostgreSQL, MongoDB, Valkey               |
| **Event**     | NATS JetStream                            |
| **Storage**   | MinIO (S3)                                |
| **WebSocket** | Socket.io + Valkey Adapter                |
| **Frontend**  | React 19.2, iOS (Swift), Android (Kotlin) |
