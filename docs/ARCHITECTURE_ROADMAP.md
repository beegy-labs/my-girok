# Architecture Roadmap (2025)

> 추후 구현 시 참고용 설계 문서

## 현재 구현 상태

### Implemented
- **auth-service** - NestJS, PostgreSQL, REST + gRPC
- **personal-service** - NestJS, PostgreSQL, REST + gRPC
- **web-main** - React 19.2, Vite, Tailwind CSS

### Planned (Not Implemented)
아래는 추후 구현 예정인 서비스들의 설계 참고 내역입니다.

---

## 1. GraphQL BFF (Gateway)

### 목적
- Full BFF Pattern (IETF 권장)
- 세션 기반 인증 (HttpOnly 쿠키)
- GraphQL Federation으로 서비스 통합

### 기술 스택
```
NestJS 11 + Apollo Federation + @nestjs/graphql
Port: 4000
```

### 핵심 설계
```typescript
// 세션 기반 인증 - 토큰을 브라우저에 노출하지 않음
@Mutation(() => AuthResponse)
async login(@Args('input') input: LoginInput, @Context() ctx: GqlContext) {
  const tokens = await this.authGrpc.login(input);

  // 세션에 토큰 저장 (서버 사이드)
  const sessionId = await this.sessionService.create({
    userId: tokens.userId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  // HttpOnly 쿠키로 세션 ID만 전달
  ctx.res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
  });

  return { success: true };
}
```

### 참고 URL
- https://api.girok.dev/graphql

---

## 2. WebSocket Gateway

### 목적
- 실시간 이벤트 브로드캐스팅
- 채팅, 알림, 피드 업데이트

### 기술 스택
```
NestJS 11 + Socket.io + Valkey Adapter
Port: 3001
```

### 핵심 설계
```typescript
// Socket.io 네임스페이스
const namespaces = {
  '/chat': '채팅 메시지',
  '/feed': '피드 업데이트',
  '/notifications': '알림',
  '/matching': '랜덤 매칭',
};

// Valkey Adapter로 Pod 간 브로드캐스팅
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {
  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(`room:${roomId}`);
  }
}

// NATS 이벤트 → WebSocket 브로드캐스팅
@NatsSubscribe('chat.message.sent')
async handleMessageSent(data: MessageEvent) {
  this.server.to(`room:${data.roomId}`).emit('new_message', data);
}
```

### 참고 URL
- wss://ws.girok.dev

---

## 3. Feed Service

### 목적
- 타임라인, 포스트 관리
- Fan-out on Write 패턴

### 기술 스택
```
NestJS 11 + MongoDB + gRPC
Port: 50053
```

### 핵심 설계 (MongoDB Schema)
```typescript
// Post 컬렉션
{
  _id: ObjectId,
  authorId: string,
  content: string,
  mediaUrls: string[],
  likesCount: number,
  commentsCount: number,
  createdAt: Date,
}

// Timeline 컬렉션 (Fan-out)
{
  _id: ObjectId,
  userId: string,        // 타임라인 소유자
  postId: ObjectId,      // 포스트 참조
  authorId: string,      // 작성자
  score: number,         // 정렬용 (timestamp)
  createdAt: Date,
}
```

### NATS 이벤트
```
feed.post.created → Timeline Fan-out 트리거
feed.post.liked → 좋아요 카운터 업데이트
```

---

## 4. Chat Service

### 목적
- 1:1, 그룹, 랜덤 채팅
- 메시지 저장 및 조회

### 기술 스택
```
NestJS 11 + MongoDB + gRPC
Port: 50054
```

### 핵심 설계 (MongoDB Schema)
```typescript
// Room 컬렉션
{
  _id: ObjectId,
  type: 'direct' | 'group' | 'random',
  memberIds: string[],
  lastMessageAt: Date,
  // random인 경우 TTL 인덱스로 24시간 후 자동 삭제
  expiresAt: Date,
}

// Message 컬렉션
{
  _id: ObjectId,
  roomId: ObjectId,
  authorId: string,
  content: string,
  type: 'text' | 'image' | 'system',
  createdAt: Date,
}
```

### NATS 이벤트
```
chat.message.sent → WS Gateway로 실시간 전달
chat.room.created → 알림 서비스
```

---

## 5. Matching Service

### 목적
- 랜덤 채팅 매칭
- 대기열 관리

### 기술 스택
```
NestJS 11 + Valkey + gRPC
Port: 50055
```

### 핵심 설계 (Valkey)
```typescript
// 대기열: Sorted Set (score = timestamp)
ZADD matching:queue <timestamp> <userId>

// 매칭 로직
const [user1, user2] = await redis.zpopmin('matching:queue', 2);
if (user1 && user2) {
  // Chat Service에 방 생성 요청
  const room = await this.chatGrpc.createRoom({
    type: 'random',
    memberIds: [user1, user2],
  });

  // NATS로 매칭 결과 발행
  await this.nats.publish('matching.matched', { roomId: room.id, users: [user1, user2] });
}

// 스킵 히스토리: Set with TTL
SADD skip:<userId> <skippedUserId>
EXPIRE skip:<userId> 86400  // 24시간
```

---

## 6. Media Service

### 목적
- 이미지 업로드, 리사이징
- S3 호환 스토리지 (MinIO)

### 기술 스택
```
NestJS 11 + MinIO + Sharp + gRPC
Port: 50056
```

### 핵심 설계
```typescript
// Presigned URL 발급
async getPresignedUrl(folder: string, filename: string) {
  const key = `${folder}/${userId}/${Date.now()}-${filename}`;
  const url = await this.minio.presignedPutObject(bucket, key, 3600);
  return { uploadUrl: url, publicUrl: `https://s3.girok.dev/${bucket}/${key}` };
}

// 이미지 처리 (BullMQ)
@Process('resize')
async handleResize(job: Job) {
  const variants = [
    { name: 'thumb', width: 200, height: 200 },
    { name: 'medium', width: 800, height: 800 },
  ];

  for (const v of variants) {
    const buffer = await sharp(original).resize(v.width, v.height).webp().toBuffer();
    await this.minio.putObject(bucket, `${key}_${v.name}.webp`, buffer);
  }
}
```

---

## 7. LLM API

### 목적
- AI 기능 (요약, 추천, 생성)

### 기술 스택
```
Python 3.13 + FastAPI + LangChain
Port: 8000
```

### 핵심 설계
```python
@app.post("/v1/summarize")
async def summarize(request: SummarizeRequest):
    chain = load_summarize_chain(llm, chain_type="stuff")
    result = await chain.arun(request.text)
    return {"summary": result}

@app.post("/v1/chat")
async def chat(request: ChatRequest):
    messages = [HumanMessage(content=request.message)]
    response = await llm.agenerate([messages])
    return {"response": response.generations[0][0].text}
```

---

## 8. NATS JetStream 이벤트

### 스트림 설계
```yaml
streams:
  - name: AUTH
    subjects: ["auth.>"]
    retention: limits
    max_age: 7d

  - name: FEED
    subjects: ["feed.>"]
    retention: limits
    max_age: 30d

  - name: CHAT
    subjects: ["chat.>"]
    retention: limits
    max_age: 7d

  - name: MATCHING
    subjects: ["matching.>"]
    retention: limits
    max_age: 1d
```

### 이벤트 목록
```
# Auth
auth.user.registered    → Feed에 기본 타임라인 생성
auth.user.logged_in     → 활동 로그

# Feed
feed.post.created       → Timeline fan-out, WS 브로드캐스트
feed.post.liked         → 알림, 카운터 업데이트

# Chat
chat.message.sent       → WS 브로드캐스트, 읽지 않음 카운터
chat.room.created       → 참여자에게 알림

# Matching
matching.user.joined    → 대기열 추가
matching.matched        → 방 생성, WS 알림
```

---

## 9. Cilium Gateway API

### HTTPRoute 설계
```yaml
# GraphQL BFF
- host: api.girok.dev
  path: /graphql
  backend: graphql-bff:4000

# WebSocket
- host: ws.girok.dev
  path: /socket.io
  backend: ws-gateway:3001

# Auth (Direct REST)
- host: auth.girok.dev
  path: /v1/auth
  backend: auth-service:3002

# Media
- host: s3.girok.dev
  backend: minio:9000
```

---

## 10. Kubernetes Namespace

```yaml
gateway:        # Cilium, GraphQL BFF, WS Gateway
services:       # auth, personal, feed, chat, matching, media
data:           # PostgreSQL, MongoDB, Valkey, NATS, MinIO
realtime:       # LiveKit
observability:  # Prometheus, Grafana, Jaeger
```

---

## 구현 우선순위 (권장)

1. **GraphQL BFF** - 프론트엔드 통합 포인트
2. **WS Gateway** - 실시간 기능 기반
3. **Feed Service** - 핵심 소셜 기능
4. **Chat Service** - 채팅 기능
5. **Matching Service** - 랜덤 채팅
6. **Media Service** - 이미지 처리
7. **LLM API** - AI 기능

각 서비스 구현 시 이 문서의 설계를 참고하세요.
