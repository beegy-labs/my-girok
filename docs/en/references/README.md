# 2026 Best Practices References

This directory contains comprehensive best practices documentation compiled from industry standards and research conducted in 2026. These documents serve as reference material to guide architectural decisions and ensure alignment with modern development practices.

## Purpose

The references in this directory help development teams:

- Make informed architectural decisions without extensive web searches
- Stay current with industry best practices
- Ensure consistency across the codebase
- Validate existing patterns against 2026 standards

## Document Index

### Core Technologies

| Document                                             | Description                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [RAG & Chunking](rag-chunking-2026.md)               | Best practices for document chunking in RAG systems, including optimal token ranges and semantic splitting strategies |
| [Frontend (React 19)](frontend-react-2026.md)        | React Compiler, use() hook, Server Components, and modern React patterns                                              |
| [Backend (NestJS)](backend-nestjs-2026.md)           | Module organization, dependency injection, gRPC integration, and service patterns                                     |
| [Database (PostgreSQL)](database-postgresql-2026.md) | UUIDv7 adoption, VACUUM strategies, pgvector for AI features, and indexing best practices                             |
| [Testing](testing-2026.md)                           | Test pyramid, 80% coverage target, unit/integration/E2E balance                                                       |
| [Security](security-2026.md)                         | OWASP Top 10 2025, DevSecOps practices, and supply chain security                                                     |
| [CI/CD](cicd-devops-2026.md)                         | GitHub Actions workflows, GitOps with ArgoCD, and deployment automation                                               |
| [API Design](api-design-2026.md)                     | REST, GraphQL Federation, gRPC selection criteria and patterns                                                        |
| [Kubernetes](kubernetes-2026.md)                     | HPA configuration, security policies, Helm chart best practices                                                       |

### Language & Runtime

| Document                         | Description                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| [TypeScript](typescript-2026.md) | Strict mode configuration, Zod validation, type guard patterns |
| [Prisma ORM](prisma-orm-2026.md) | Prisma 7 features, N+1 prevention, relation queries            |

### Infrastructure

| Document                                 | Description                                                  |
| ---------------------------------------- | ------------------------------------------------------------ |
| [Valkey/Redis](valkey-caching-2026.md)   | Caching patterns, session management, cluster configuration  |
| [Observability](observability-2026.md)   | OpenTelemetry setup, distributed tracing, metrics collection |
| [Message Queue](message-queue-2026.md)   | Kafka/Redpanda patterns, event-driven architecture           |
| [Docker](docker-2026.md)                 | Multi-stage builds, Alpine optimization, security hardening  |
| [Object Storage](object-storage-2026.md) | S3-compatible storage, MinIO/Garage selection                |
| [ClickHouse](clickhouse-2026.md)         | OLAP queries, analytics tables, query optimization           |

### Communication

| Document                                         | Description                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| [gRPC](grpc-2026.md)                             | Protobuf definitions, streaming patterns, Node.js implementation |
| [GraphQL Federation](graphql-federation-2026.md) | Apollo Federation 2, subgraph design, entity resolution          |

### Build & Development

| Document                     | Description                                            |
| ---------------------------- | ------------------------------------------------------ |
| [Vite](vite-build-2026.md)   | SWC integration, code splitting, HMR optimization      |
| [Monorepo](monorepo-2026.md) | pnpm workspaces, Turborepo caching, package management |

### Frontend Patterns

| Document                         | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| [Tailwind CSS](tailwind-2026.md) | v4 @theme directive, design tokens, CSS-first configuration |
| [i18n](i18n-2026.md)             | react-i18next setup, RTL support, plural handling           |

### Security & Auth

| Document                               | Description                                                    |
| -------------------------------------- | -------------------------------------------------------------- |
| [Auth Patterns](auth-patterns-2026.md) | JWT best practices, OAuth 2.1, session management, BFF pattern |

### Version Management

| Document                                     | Description                                         |
| -------------------------------------------- | --------------------------------------------------- |
| [Package Versions](package-versions-2026.md) | Current stable versions, pnpm catalog configuration |

## Usage Guidelines

### When to Consult These Documents

| Scenario                   | Recommended Documents                               |
| -------------------------- | --------------------------------------------------- |
| Starting a new service     | `backend-nestjs-2026.md`, `grpc-2026.md`            |
| Building frontend features | `frontend-react-2026.md`, `tailwind-2026.md`        |
| Database schema design     | `database-postgresql-2026.md`, `prisma-orm-2026.md` |
| Implementing caching       | `valkey-caching-2026.md`                            |
| Setting up analytics       | `clickhouse-2026.md`, `observability-2026.md`       |
| Authentication flows       | `auth-patterns-2026.md`, `security-2026.md`         |
| Build optimization         | `vite-build-2026.md`, `docker-2026.md`              |
| Adding translations        | `i18n-2026.md`                                      |

### Update Policy

These documents follow a quarterly review cycle:

- **Review Frequency**: Every 3 months
- **Source**: Aggregated from official documentation, industry blogs, and community best practices
- **Format**: Concise, actionable guidance with source links
- **Date Tracking**: Each document includes the research date for reference

## Migration Guide

For information on aligning the codebase with these best practices, see:

- [Best Practices Migration](../policies/best-practices-migration.md) - Tracking code changes needed

Current migration priorities:

1. **P0**: React Compiler adoption
2. **P1**: Test coverage to 80%
3. **P2**: UUIDv7 migration for internal IDs

---

_See also: [Best Practices Policy](../policies/best-practices-2026.md)_
