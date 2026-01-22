# 2026 Best Practices References

> External knowledge base to reduce web searches | **Last Updated**: 2026-01-22

## Index

### Core Technologies

| Topic                 | File                          | Key Points                     | Researched |
| --------------------- | ----------------------------- | ------------------------------ | ---------- |
| RAG & Chunking        | `rag-chunking-2026.md`        | 300-800 tokens, semantic-first | 2026-01-22 |
| Frontend (React 19)   | `frontend-react-2026.md`      | Compiler, use(), RSC           | 2026-01-22 |
| Backend (NestJS)      | `backend-nestjs-2026.md`      | Modules, DI, gRPC              | 2026-01-22 |
| Database (PostgreSQL) | `database-postgresql-2026.md` | UUIDv7, VACUUM, pgvector       | 2026-01-22 |
| Testing               | `testing-2026.md`             | Pyramid, 80% coverage          | 2026-01-22 |
| Security              | `security-2026.md`            | OWASP Top 10, DevSecOps        | 2026-01-22 |
| CI/CD                 | `cicd-devops-2026.md`         | GitHub Actions, GitOps         | 2026-01-22 |
| API Design            | `api-design-2026.md`          | REST, GraphQL, gRPC            | 2026-01-22 |
| Kubernetes            | `kubernetes-2026.md`          | HPA, security, Helm            | 2026-01-22 |

### Language & Runtime

| Topic      | File                 | Key Points                    | Researched |
| ---------- | -------------------- | ----------------------------- | ---------- |
| TypeScript | `typescript-2026.md` | Strict mode, Zod, type guards | 2026-01-22 |
| Prisma ORM | `prisma-orm-2026.md` | v7 TypeScript, N+1, joins     | 2026-01-22 |

### Infrastructure

| Topic          | File                     | Key Points                    | Researched |
| -------------- | ------------------------ | ----------------------------- | ---------- |
| Valkey/Redis   | `valkey-caching-2026.md` | Cache patterns, sessions      | 2026-01-22 |
| Observability  | `observability-2026.md`  | OpenTelemetry, tracing        | 2026-01-22 |
| Message Queue  | `message-queue-2026.md`  | Kafka, event-driven           | 2026-01-22 |
| Docker         | `docker-2026.md`         | Multi-stage, Alpine, security | 2026-01-22 |
| Object Storage | `object-storage-2026.md` | S3-compatible, MinIO/Garage   | 2026-01-22 |
| ClickHouse     | `clickhouse-2026.md`     | OLAP, analytics, optimization | 2026-01-22 |

### Communication

| Topic              | File                         | Key Points                   | Researched |
| ------------------ | ---------------------------- | ---------------------------- | ---------- |
| gRPC               | `grpc-2026.md`               | Protobuf, streaming, Node.js | 2026-01-22 |
| GraphQL Federation | `graphql-federation-2026.md` | Apollo, subgraphs, entities  | 2026-01-22 |

### Build & Development

| Topic    | File                 | Key Points                  | Researched |
| -------- | -------------------- | --------------------------- | ---------- |
| Vite     | `vite-build-2026.md` | SWC, code splitting, HMR    | 2026-01-22 |
| Monorepo | `monorepo-2026.md`   | pnpm, Turborepo, workspaces | 2026-01-22 |

### Frontend Patterns

| Topic        | File               | Key Points                  | Researched |
| ------------ | ------------------ | --------------------------- | ---------- |
| Tailwind CSS | `tailwind-2026.md` | @theme, design tokens, v4   | 2026-01-22 |
| i18n         | `i18n-2026.md`     | react-i18next, RTL, plurals | 2026-01-22 |

### Security & Auth

| Topic         | File                    | Key Points                | Researched |
| ------------- | ----------------------- | ------------------------- | ---------- |
| Auth Patterns | `auth-patterns-2026.md` | JWT, OAuth2, session, BFF | 2026-01-22 |

### Version Management

| Topic            | File                       | Key Points               | Researched |
| ---------------- | -------------------------- | ------------------------ | ---------- |
| Package Versions | `package-versions-2026.md` | Stable versions, catalog | 2026-01-22 |

## Usage

These documents are **reference material** from 2026 industry best practices.
Consult when making architectural decisions or validating current patterns.

### When to Read

| Scenario           | Documents to Check                                  |
| ------------------ | --------------------------------------------------- |
| Adding new service | `backend-nestjs-2026.md`, `grpc-2026.md`            |
| Frontend feature   | `frontend-react-2026.md`, `tailwind-2026.md`        |
| Database design    | `database-postgresql-2026.md`, `prisma-orm-2026.md` |
| Caching strategy   | `valkey-caching-2026.md`                            |
| Analytics/Logs     | `clickhouse-2026.md`, `observability-2026.md`       |
| Authentication     | `auth-patterns-2026.md`, `security-2026.md`         |
| Build optimization | `vite-build-2026.md`, `docker-2026.md`              |
| Multi-language     | `i18n-2026.md`                                      |

## Migration Guide

For code changes needed to align with these best practices:

**See**: `policies/best-practices-migration.md`

| Priority | Task                    | Status  |
| -------- | ----------------------- | ------- |
| P0       | React Compiler adoption | Pending |
| P1       | Test coverage to 80%    | Pending |
| P2       | UUIDv7 migration        | Pending |

## Update Policy

- **Review**: Quarterly
- **Source**: Web search aggregation
- **Format**: Concise, actionable, with source links
- **Date Tracking**: Each document includes `Researched` date

---

_Main: `best-practices.md`_
