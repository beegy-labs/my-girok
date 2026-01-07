# Documentation Index

> Comprehensive documentation for the my-girok platform

## Documentation Structure

| Path            | Content                              |
| --------------- | ------------------------------------ |
| policies/       | Policy specifications and guidelines |
| services/       | Backend service documentation        |
| guides/         | Technical implementation guides      |
| packages/       | Shared package documentation         |
| apps/           | Frontend application documentation   |
| infrastructure/ | Infrastructure specifications        |
| reports/        | Analysis and review reports          |

## Services Overview

| Service           | REST Port | gRPC Port | Database    |
| ----------------- | --------- | --------- | ----------- |
| identity-service  | 3005      | 50051     | identity_db |
| auth-service      | 3001      | 50052     | auth_db     |
| legal-service     | 3006      | 50053     | legal_db    |
| personal-service  | 4002      | -         | personal_db |
| audit-service     | 3010      | -         | ClickHouse  |
| analytics-service | 3011      | -         | ClickHouse  |

## Policies

| Document                      | Topic                                    |
| ----------------------------- | ---------------------------------------- |
| documentation-architecture.md | Documentation structure and flow         |
| security.md                   | Security policies and requirements       |
| testing.md                    | Test standards and coverage requirements |
| performance.md                | Performance targets and optimization     |
| deployment.md                 | Kubernetes deployment guidelines         |
| database.md                   | Database migrations with goose           |
| caching.md                    | Valkey/Redis caching strategies          |
| legal-consent.md              | GDPR/PIPA consent management             |
| identity-platform.md          | Multi-application authentication         |
| global-account.md             | Account modes and linking                |
| best-practices-2026.md        | 2026 development checklist               |

## Guides

| Document               | Topic                             |
| ---------------------- | --------------------------------- |
| grpc.md                | gRPC inter-service communication  |
| resume.md              | Resume feature implementation     |
| admin-audit.md         | Admin audit system                |
| consent-flow.md        | User consent handling             |
| account-linking.md     | Multi-service account linking     |
| operator-management.md | Service operator management       |
| otel-browser.md        | Browser OpenTelemetry integration |
| seo-guide.md           | SEO optimization guidelines       |
| web-admin.md           | Admin console documentation       |
| adsense-guide.md       | Google AdSense integration        |

## Packages

| Package       | Purpose                            |
| ------------- | ---------------------------------- |
| types         | Shared TypeScript type definitions |
| nest-common   | NestJS utilities and decorators    |
| ui-components | React component library            |
| design-tokens | WCAG 2.1 AAA design tokens         |

## Quick Navigation

| Task                 | Document                   |
| -------------------- | -------------------------- |
| Core rules           | policies/llm-guidelines.md |
| Architecture         | architecture-roadmap.md    |
| CI/CD pipeline       | ci-cd.md                   |
| Docker setup         | docker-deployment.md       |
| Internationalization | i18n.md                    |
| Test coverage        | test-coverage.md           |
| Design system        | design-system.md           |

---

**LLM Reference**: `docs/llm/README.md`
