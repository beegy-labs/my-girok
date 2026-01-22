# docs/llm Index

> CDD Tier 2 - LLM Detailed Information (SSOT) | Multi-LLM Compatible

## Tier 2 Rules

| Rule           | Value     | Description                       |
| -------------- | --------- | --------------------------------- |
| Max Lines      | ≤300      | Split file if exceeded            |
| Weekly Cleanup | Once/week | Remove legacy, verify reliability |

## Tier 2 Role Definition

| Path                | Role               | When to Read                            |
| ------------------- | ------------------ | --------------------------------------- |
| **policies/**       | Project-wide rules | First read or policy-related tasks      |
| **services/**       | Service SSOT       | When working on that service (required) |
| **guides/**         | How-to guides      | When implementing specific features     |
| **packages/**       | Package specs      | When using/modifying that package       |
| **infrastructure/** | Infra specs        | When working on infrastructure          |

## Task Reference Mapping

| Task Type         | Required Files                                                    |
| ----------------- | ----------------------------------------------------------------- |
| **auth-service**  | `services/auth-service.md`                                        |
| **auth-bff**      | `services/auth-bff.md`                                            |
| **identity**      | `services/identity-service.md`, `policies/identity-platform.md`   |
| **authorization** | `services/authorization-service.md`, `policies/authorization.md`  |
| **DB migration**  | `policies/database.md`, `policies/database-migration-strategy.md` |
| **Testing**       | `policies/testing.md`                                             |
| **Security**      | `policies/security.md`                                            |
| **Caching**       | `policies/caching.md`                                             |
| **Frontend**      | `guides/web-admin.md` or `apps/web-girok.md`                      |
| **Deployment**    | `policies/deployment.md`                                          |
| **Observability** | `policies/observability-2026.md`                                  |

## Structure

| Path            | Content          |
| --------------- | ---------------- |
| policies/       | Policy specs     |
| services/       | Service specs    |
| guides/         | Technical guides |
| packages/       | Package specs    |
| infrastructure/ | Infra specs      |

## Services

| Service           | Port | gRPC  | DB          |
| ----------------- | ---- | ----- | ----------- |
| identity-service  | 3005 | 50051 | identity_db |
| auth-service      | 3001 | 50052 | auth_db     |
| legal-service     | 3006 | 50053 | legal_db    |
| personal-service  | 4002 | -     | personal_db |
| audit-service     | 3010 | -     | ClickHouse  |
| analytics-service | 3011 | -     | ClickHouse  |

## Policies

| File                       | Topic          |
| -------------------------- | -------------- |
| development-methodology.md | CDD/SDD/ADD    |
| cdd.md                     | CDD policy     |
| security.md                | Security rules |
| testing.md                 | Test standards |
| performance.md             | Perf targets   |
| deployment.md              | K8s deploy     |
| database.md                | DB migrations  |
| caching.md                 | Valkey/Redis   |
| legal-consent.md           | GDPR/PIPA      |
| identity-platform.md       | Multi-app auth |
| global-account.md          | Account modes  |
| best-practices-2026.md     | 2026 checklist |

## Guides

| File                   | Topic            |
| ---------------------- | ---------------- |
| grpc.md                | gRPC setup       |
| resume.md              | Resume feature   |
| admin-audit.md         | Admin audit      |
| consent-flow.md        | Consent handling |
| account-linking.md     | Account linking  |
| operator-management.md | Operators        |

## Packages

| Package       | Purpose         |
| ------------- | --------------- |
| types         | Shared TS types |
| nest-common   | NestJS utils    |
| ui-components | React UI        |
| design-tokens | WCAG tokens     |

## Entry Points

| Task          | File             |
| ------------- | ---------------- |
| Rules         | rules.md         |
| Architecture  | architecture.md  |
| Project setup | project-setup.md |
| Git flow      | git-flow.md      |
