# 문서 인덱스

> my-girok 플랫폼에 대한 종합 문서

## 문서 구조

| 경로            | 내용                         |
| --------------- | ---------------------------- |
| policies/       | 정책 사양 및 가이드라인      |
| services/       | 백엔드 서비스 문서           |
| guides/         | 기술 구현 가이드             |
| packages/       | 공유 패키지 문서             |
| apps/           | 프론트엔드 애플리케이션 문서 |
| infrastructure/ | 인프라 사양                  |
| reports/        | 분석 및 리뷰 리포트          |

## 서비스 개요

| 서비스            | REST 포트 | gRPC 포트 | 데이터베이스 |
| ----------------- | --------- | --------- | ------------ |
| identity-service  | 3005      | 50051     | identity_db  |
| auth-service      | 3001      | 50052     | auth_db      |
| legal-service     | 3006      | 50053     | legal_db     |
| personal-service  | 4002      | -         | personal_db  |
| audit-service     | 3010      | -         | ClickHouse   |
| analytics-service | 3011      | -         | ClickHouse   |

## 정책

| 문서                          | 주제                                     |
| ----------------------------- | ---------------------------------------- |
| documentation-architecture.md | 문서 구조 및 흐름                        |
| security.md                   | 보안 정책 및 요구사항                    |
| testing.md                    | 테스트 표준 및 커버리지 요구사항         |
| performance.md                | 성능 목표 및 최적화                      |
| deployment.md                 | Kubernetes 배포 가이드라인               |
| database.md                   | goose를 이용한 데이터베이스 마이그레이션 |
| caching.md                    | Valkey/Redis 캐싱 전략                   |
| legal-consent.md              | GDPR/PIPA 동의 관리                      |
| identity-platform.md          | 다중 애플리케이션 인증                   |
| global-account.md             | 계정 모드 및 연결                        |
| best-practices-2026.md        | 2026 개발 체크리스트                     |

## 가이드

| 문서                   | 주제                        |
| ---------------------- | --------------------------- |
| grpc.md                | gRPC 인터서비스 통신        |
| resume.md              | 이력서 기능 구현            |
| admin-audit.md         | 관리자 감사 시스템          |
| consent-flow.md        | 사용자 동의 처리            |
| account-linking.md     | 다중 서비스 계정 연결       |
| operator-management.md | 서비스 운영자 관리          |
| otel-browser.md        | 브라우저 OpenTelemetry 통합 |
| seo-guide.md           | SEO 최적화 가이드라인       |
| web-admin.md           | 관리자 콘솔 문서            |
| adsense-guide.md       | Google AdSense 통합         |

## 패키지

| 패키지        | 용도                          |
| ------------- | ----------------------------- |
| types         | 공유 TypeScript 타입 정의     |
| nest-common   | NestJS 유틸리티 및 데코레이터 |
| ui-components | React 컴포넌트 라이브러리     |
| design-tokens | WCAG 2.1 AAA 디자인 토큰      |

## 빠른 탐색

| 작업             | 문서                       |
| ---------------- | -------------------------- |
| 핵심 규칙        | policies/llm-guidelines.md |
| 아키텍처         | architecture-roadmap.md    |
| CI/CD 파이프라인 | ci-cd.md                   |
| Docker 설정      | docker-deployment.md       |
| 국제화           | i18n.md                    |
| 테스트 커버리지  | test-coverage.md           |
| 디자인 시스템    | design-system.md           |

**LLM 참조**: `docs/llm/README.md`
