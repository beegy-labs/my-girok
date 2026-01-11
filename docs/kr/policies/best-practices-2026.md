# 베스트 프랙티스 2026

> 개발 표준에 대한 월간 검토 체크리스트

**검토 주기**: 월간  
**최종 업데이트**: 2026-01-02

## 기술 스택

| 카테고리     | 기술                                  | 버전                |
| ------------ | ------------------------------------- | ------------------- |
| 프론트엔드   | React, TypeScript, Tailwind CSS, Vite | 19.2, 5.9, 4.1, 7.2 |
| 백엔드       | Node.js, NestJS, Prisma               | 24, 11, 6           |
| 데이터베이스 | PostgreSQL, ClickHouse, Valkey        | 16, Latest, Latest  |
| 마이그레이션 | goose                                 | Latest              |
| DevOps       | Kubernetes, ArgoCD, Helm              | 1.30, 2.13, 3.16    |

## 개발 체크리스트

### 데이터베이스

- [ ] 모든 마이그레이션에 goose 사용 (SSOT)
- [ ] Prisma 마이그레이션 금지 (단 `prisma db pull`만 사용)
- [ ] ClickHouse: StatementBegin/End 사용
- [ ] 파일명 규칙: YYYYMMDDHHMMSS_description.sql
- [ ] 항상 `-- +goose Down` 포함
- [ ] PostgreSQL: ID는 TEXT, TIMESTAMPTZ(6) 사용
- [ ] ClickHouse: 시간 정렬 가능한 ID에 UUIDv7 사용

### 프론트엔드 (React 19+)

- [ ] React Compiler 사용 (수동 memo 금지)
- [ ] 비동기 데이터에 `use()` 훅 사용
- [ ] `useOptimistic`, `useActionState` 사용
- [ ] Tailwind CSS 4와 @theme 지시어 사용
- [ ] design-tokens 패키지에서 import
- [ ] WCAG 2.1 AAA 준수 (4.5:1 대비, 44px 터치 타깃)
- [ ] 인라인 스타일 금지

### 백엔드 (NestJS 11+)

- [ ] 다단계 DB 작업에 `@Transactional()` 사용
- [ ] 내부는 gRPC, 외부는 REST 사용
- [ ] @my-girok/nest-common 유틸리티 사용
- [ ] class-validator로 검증
- [ ] 공개 엔드포인트에 레이트 리미팅 적용

### TypeScript 5.9+

- [ ] Strict 모드 활성화
- [ ] `any` 금지 (대신 `unknown` 사용)
- [ ] `satisfies`, const 타입 파라미터 사용
- [ ] @my-girok/types에서 import
- [ ] Prisma 생성 타입 사용

### 테스트

- [ ] 최소 80% 커버리지
- [ ] 단위, 통합, E2E 테스트
- [ ] 시간 의존 테스트 금지
- [ ] 테스트 fixture 사용

### 보안

- [ ] Sealed Secrets / HashiCorp Vault 사용
- [ ] 입력 정제
- [ ] SQL 인젝션 방지
- [ ] XSS 방지
- [ ] CSRF 방지
- [ ] 인증 엔드포인트에 레이트 리미팅
- [ ] 종합 감사 로깅

### DevOps

- [ ] GitHub Actions CI/CD
- [ ] ArgoCD GitOps 배포
- [ ] DB 변경에 수동 동기화
- [ ] 모든 서비스에 Helm 차트
- [ ] 헬스 체크 엔드포인트
- [ ] 리소스 제한 설정
- [ ] HPA (Horizontal Pod Autoscaler)

### Git 워크플로우

- [ ] GitFlow 브랜칭 따르기
- [ ] 스쿼시 병합: feature → develop
- [ ] 정기 병합: develop → release → main
- [ ] Conventional 커밋 메시지
- [ ] 필수 PR 리뷰
- [ ] 브랜치 보호 규칙

## 피해야 할 안티 패턴

### 데이터베이스

| 금지                       | 대신 사용     |
| -------------------------- | ------------- |
| prisma migrate             | goose         |
| UUID type (PostgreSQL)     | TEXT          |
| Modify existing migrations | New migration |
| Auto-sync ArgoCD for DB    | Manual sync   |

### 프론트엔드

| 금지                            | 대신 사용                   |
| ------------------------------- | --------------------------- |
| Manual memo/useMemo/useCallback | React Compiler              |
| Inline styles                   | SSOT design tokens          |
| Direct DOM manipulation         | React state                 |
| Prop drilling                   | Context or state management |

### 백엔드

| 금지                    | 대신 사용          |
| ----------------------- | ------------------ |
| Logic in controllers    | Services layer     |
| Direct DB access        | Repository pattern |
| Synchronous I/O         | Async/await        |
| Hardcoded configuration | ConfigService      |

### 일반 원칙

| 피해야 할                                        |
| ------------------------------------------------ |
| 가설적 요구사항에 대한 과도한 엔지니어링         |
| 일회성 작업에 대한 추상화                        |
| 요청된 것 이상의 기능                            |
| 사용되지 않은 코드에 대한 backward-compatibility |

**LLM 참조**: `docs/llm/policies/BEST_PRACTICES_2026.md`
