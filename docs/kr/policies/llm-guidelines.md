# LLM 가이드라인

> AI 어시스턴트용 문서 표준 및 개발 규칙

## 언어 정책

**모든 문서는 영어로 작성해야 합니다:**

- README 파일
- API 문서
- 코드 주석
- 커밋 메시지

## 문서 구조

| 디렉터리 | 목적             | 주요 대상      |
| -------- | ---------------- | -------------- |
| .ai/     | 토큰 최적화 문서 | LLM 어시스턴트 |
| docs/    | 상세 문서        | 인간 + LLM     |

## 자동 업데이트 규칙

| 변경 유형          | .ai/ 업데이트        | docs/ 업데이트      |
| ------------------ | -------------------- | ------------------- |
| New component/hook | apps/ 또는 packages/ | -                   |
| New API endpoint   | services/            | -                   |
| New pattern        | rules.md             | -                   |
| Major feature      | 관련 파일            | guides/             |
| New policy         | rules.md 요약        | policies/ 전체 문서 |

## 기술 스택

| 카테고리  | 기술                                                    |
| --------- | ------------------------------------------------------- |
| Web       | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind CSS 4.1  |
| Mobile    | iOS (Swift), Android (Kotlin), Flutter (cross-platform) |
| Backend   | Node.js 24, NestJS 11                                   |
| Database  | PostgreSQL 16, Prisma 6, Valkey 8                       |
| Gateway   | Cilium Gateway API                                      |
| Protocols | GraphQL (external), gRPC (internal), NATS               |

## 아키텍처 개요

```
Client -> GraphQL BFF -> gRPC -> Services -> Database
                |
          NATS JetStream
```

**Full BFF 패턴**: 세션 쿠키는 BFF에서 관리되며, 토큰은 브라우저에 노출되지 않습니다.

## 프로젝트 구조

```
my-girok/
├── apps/
│   └── web-girok/               # Public web application
├── services/
│   ├── auth-service/           # Authentication/authorization
│   ├── identity-service/       # User identity
│   ├── personal-service/       # User data, resumes
│   └── ...
└── packages/
    ├── types/                  # Shared TypeScript types
    ├── nest-common/            # NestJS utilities
    └── design-tokens/          # UI design tokens
```

## 필수 규칙

### NEVER

- Duplicate types (use packages/types)
- Put Prisma calls in Controllers
- Use HTTP between services (use gRPC)
- Expose tokens to browser
- Remove analytics script
- Write non-English documentation
- Commit secrets or credentials

### ALWAYS

- Define types first in packages/types
- Validate DTOs with class-validator
- Use @Transactional() for multi-step DB operations
- Apply Guards for protected endpoints
- Maintain 80% test coverage minimum

## 커밋 메시지 형식

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, docs, test, chore, perf
```

**CRITICAL**: 커밋 메시지에 AI 지원을 언급하지 마십시오.

## 배포

```bash
# Staging
kubectl apply -k k8s/overlays/staging

# Production
kubectl apply -k k8s/overlays/production
```

---

**LLM Reference**: `docs/llm/policies/LLM_GUIDELINES.md`
