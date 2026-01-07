# docs/llm Index

## Structure

| Path            | Content          |
| --------------- | ---------------- |
| policies/       | Policy specs     |
| services/       | Service specs    |
| guides/         | Technical guides |
| packages/       | Package specs    |
| infrastructure/ | Infra specs      |
| reports/        | Analysis reports |

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

| File                          | Topic          |
| ----------------------------- | -------------- |
| documentation-architecture.md | Doc structure  |
| security.md                   | Security rules |
| testing.md                    | Test standards |
| performance.md                | Perf targets   |
| deployment.md                 | K8s deploy     |
| database.md                   | DB migrations  |
| caching.md                    | Valkey/Redis   |
| legal-consent.md              | GDPR/PIPA      |
| identity-platform.md          | Multi-app auth |
| global-account.md             | Account modes  |
| best-practices-2026.md        | 2026 checklist |

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
