# Architecture 2025 (확정)

> 최종 아키텍처 설계 문서

## 확정된 통신 전략

### 하이브리드 (REST + gRPC + GraphQL)

| 구간 | 프로토콜 | 용도 |
|------|----------|------|
| **Client → BFF** | GraphQL | 메인 API, 유연한 쿼리 |
| **Client → Service** | REST | OAuth 콜백, 단순 API |
| **BFF → Service** | gRPC | 내부 통신 |
| **Service → Service** | gRPC | 내부 통신 |
| **Event** | NATS JetStream | 비동기 이벤트 |

---

## 전체 구조

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
       │ gRPC (내부 통신)
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
│              (이벤트 기반 비동기 통신)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 현재 구현 상태

| 서비스 | 상태 | 기술 |
|--------|------|------|
| auth-service | ✅ 구현됨 | NestJS, REST |
| personal-service | ✅ 구현됨 | NestJS, REST |
| web-main | ✅ 구현됨 | React 19.2, Vite |

---

## 서비스별 상세

### 1. Auth Service

**현재:** NestJS + REST
**목표:** Rust + REST + gRPC

| 포트 | 프로토콜 | 용도 |
|------|----------|------|
| :3002 | REST | 외부 (OAuth, 로그인, 프로필) |
| :50051 | gRPC | 내부 (토큰 검증, 사용자 조회) |

**REST API (외부 - 유지):**
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

**gRPC API (내부 - 추가 예정):**
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

**기술 스택 (목표):**
- Rust + Axum (REST)
- Rust + Tonic (gRPC)
- PostgreSQL + SQLx
- JWT + bcrypt

---

### 2. Personal Service

**현재:** NestJS + REST
**목표:** NestJS + REST + gRPC

| 포트 | 프로토콜 | 용도 |
|------|----------|------|
| :3003 | REST | 외부 (공개 프로필) |
| :50052 | gRPC | 내부 (BFF 연동) |

**gRPC API (추가 예정):**
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

### 3. GraphQL BFF (미구현)

**역할:** 클라이언트 단일 진입점, 세션 관리

| 포트 | 프로토콜 | 용도 |
|------|----------|------|
| :4000 | GraphQL | 외부 (클라이언트) |
| - | gRPC Client | 내부 서비스 호출 |

**핵심 설계:**
```typescript
// 세션 기반 인증 (Full BFF Pattern)
@Mutation(() => AuthResponse)
async login(@Args('input') input: LoginInput, @Context() ctx: GqlContext) {
  // 1. Auth Service gRPC 호출
  const tokens = await this.authGrpc.login(input);

  // 2. 세션 생성 (서버 사이드 토큰 저장)
  const sessionId = await this.sessionService.create({
    userId: tokens.userId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  // 3. HttpOnly 쿠키 설정 (토큰 노출 안함)
  ctx.res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return { success: true };
}
```

---

### 4. WebSocket Gateway (미구현)

**역할:** 실시간 이벤트

| 포트 | 프로토콜 | 용도 |
|------|----------|------|
| :3001 | WebSocket | 외부 (클라이언트) |

**네임스페이스:**
```
/chat          → 채팅 메시지
/feed          → 피드 업데이트
/notifications → 알림
/matching      → 매칭 상태
```

**기술 스택:**
- NestJS 11 + Socket.io
- Valkey Adapter (Pod 간 브로드캐스팅)
- NATS 구독 → 클라이언트 push

---

### 5. Feed Service (미구현)

| 포트 | 프로토콜 |
|------|----------|
| :50053 | gRPC |

**gRPC API:**
```protobuf
service FeedService {
  rpc GetTimeline(GetTimelineRequest) returns (TimelineResponse);
  rpc CreatePost(CreatePostRequest) returns (Post);
  rpc GetPost(GetPostRequest) returns (Post);
  rpc LikePost(LikePostRequest) returns (LikeResponse);
}
```

**기술 스택:** NestJS + MongoDB + Fan-out on Write

---

### 6. Chat Service (미구현)

| 포트 | 프로토콜 |
|------|----------|
| :50054 | gRPC |

**gRPC API:**
```protobuf
service ChatService {
  rpc GetRooms(GetRoomsRequest) returns (RoomsResponse);
  rpc GetMessages(GetMessagesRequest) returns (MessagesResponse);
  rpc SendMessage(SendMessageRequest) returns (Message);
  rpc CreateRoom(CreateRoomRequest) returns (Room);
}
```

**기술 스택:** NestJS + MongoDB + TTL Index

---

### 7. Matching Service (미구현)

| 포트 | 프로토콜 |
|------|----------|
| :50055 | gRPC |

**gRPC API:**
```protobuf
service MatchingService {
  rpc JoinQueue(JoinQueueRequest) returns (QueueResponse);
  rpc LeaveQueue(LeaveQueueRequest) returns (Empty);
  rpc SkipUser(SkipUserRequest) returns (Empty);
}
```

**기술 스택:** NestJS + Valkey (Sorted Set)

---

### 8. Media Service (미구현)

| 포트 | 프로토콜 |
|------|----------|
| :50056 | gRPC |

**gRPC API:**
```protobuf
service MediaService {
  rpc GetUploadUrl(GetUploadUrlRequest) returns (UploadUrlResponse);
  rpc ProcessImage(ProcessImageRequest) returns (ProcessedImageResponse);
  rpc DeleteFile(DeleteFileRequest) returns (Empty);
}
```

**기술 스택:** NestJS + MinIO + Sharp + BullMQ

---

### 9. LLM API (미구현)

| 포트 | 프로토콜 |
|------|----------|
| :8000 | REST |

**기술 스택:** Python 3.13 + FastAPI + LangChain

---

## NATS JetStream 이벤트

### 스트림 설계
```yaml
AUTH:     subjects: ["auth.>"],     max_age: 7d
FEED:     subjects: ["feed.>"],     max_age: 30d
CHAT:     subjects: ["chat.>"],     max_age: 7d
MATCHING: subjects: ["matching.>"], max_age: 1d
```

### 이벤트 목록
```
auth.user.registered  → 기본 데이터 생성
auth.user.logged_in   → 활동 로그
feed.post.created     → Timeline fan-out, WS 브로드캐스트
feed.post.liked       → 알림, 카운터 업데이트
chat.message.sent     → WS 브로드캐스트
chat.room.created     → 참여자 알림
matching.matched      → 방 생성, WS 알림
```

---

## Kubernetes 구조

### Namespace
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

## Proto 파일 위치

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

## 구현 우선순위

| 순서 | 서비스 | 현재 상태 | 다음 작업 |
|------|--------|-----------|-----------|
| 1 | auth-service | NestJS 구현됨 | Rust + gRPC 전환 |
| 2 | personal-service | NestJS 구현됨 | gRPC 추가 |
| 3 | graphql-bff | 미구현 | 신규 개발 |
| 4 | ws-gateway | 미구현 | 신규 개발 |
| 5 | feed-service | 미구현 | 신규 개발 |
| 6 | chat-service | 미구현 | 신규 개발 |
| 7 | matching-service | 미구현 | 신규 개발 |
| 8 | media-service | 미구현 | 신규 개발 |
| 9 | llm-api | 미구현 | 신규 개발 |

---

## 기술 스택 요약

| 분류 | 기술 |
|------|------|
| **Gateway** | Cilium Gateway API |
| **BFF** | NestJS + Apollo Federation |
| **Auth** | Rust + Axum + Tonic |
| **Services** | NestJS + @grpc/grpc-js |
| **Database** | PostgreSQL, MongoDB, Valkey |
| **Event** | NATS JetStream |
| **Storage** | MinIO (S3) |
| **WebSocket** | Socket.io + Valkey Adapter |
| **Frontend** | React 19.2, iOS (Swift), Android (Kotlin) |
