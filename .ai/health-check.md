# Health Check

> Kubernetes health probes (2025-2026 best practices) | Package: `@my-girok/nest-common`

## Endpoints

| Endpoint          | Purpose       | Dependencies | K8s Probe      |
| ----------------- | ------------- | :----------: | -------------- |
| `/health/live`    | Process alive |      No      | livenessProbe  |
| `/health/startup` | Init complete |      No      | startupProbe   |
| `/health/ready`   | Traffic ready |   Critical   | readinessProbe |
| `/health`         | Monitoring    |     All      | -              |

## Key Rules

| Probe     | Rule                         |
| --------- | ---------------------------- |
| Liveness  | **NEVER** check dependencies |
| Readiness | Critical dependencies only   |
| Startup   | Wait for app init            |

## Indicators

| Indicator  | Critical | Services                                       |
| ---------- | :------: | ---------------------------------------------- |
| PostgreSQL |   Yes    | auth, personal, identity, authorization, legal |
| ClickHouse |   Yes    | analytics, audit                               |
| Valkey     |    No    | All (cache fallback)                           |
| Kafka      |    No    | identity, auth (async retry)                   |

**SSOT**: `docs/llm/policies/health-check.md`
