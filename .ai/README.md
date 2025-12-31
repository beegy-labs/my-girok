# AI Assistant Navigation

> **Purpose**: This directory contains LLM-optimized documentation for AI assistants working on my-girok project.

## How to Use This Directory

**When starting a new task:**

1. Read `rules.md` for core development rules
2. Read `architecture.md` for system patterns (2025 architecture)
3. Read specific service/app file based on your task

## Quick Links

### Core Documentation

- **[rules.md](rules.md)** - Essential DO/DON'T rules (READ FIRST)
- **[architecture.md](architecture.md)** - Architecture patterns (Full BFF + GraphQL + gRPC)
- **[caching.md](caching.md)** - Valkey/Redis caching patterns (Cache-Aside)
- **[ssot.md](ssot.md)** - Single Source of Truth strategy (Tailwind CSS 4)
- **[i18n-locale.md](i18n-locale.md)** - Internationalization & Locale system
- **[resume.md](resume.md)** - Resume feature documentation
- **[user-preferences.md](user-preferences.md)** - User preferences system
- **[pull-requests.md](pull-requests.md)** - PR creation and review guidelines

### Development & Deployment

- **[project-setup.md](project-setup.md)** - Quick project setup guide
- **[git-flow.md](git-flow.md)** - Git Flow workflow reference
- **[ci-cd.md](ci-cd.md)** - CI/CD pipeline (GitHub Actions + ArgoCD)
- **[database.md](database.md)** - Database migrations and management
- **[docker-deployment.md](docker-deployment.md)** - Docker Compose quick reference
- **[helm-deployment.md](helm-deployment.md)** - Kubernetes/Helm quick reference
- **[testing.md](testing.md)** - TDD guidelines and testing patterns

### Services (Implemented)

- **[services/identity-service.md](services/identity-service.md)** - Multi-app user management platform (Future)
- **[services/auth-service.md](services/auth-service.md)** - Authentication, authorization & Legal/Consent API (Current)
- **[services/personal-service.md](services/personal-service.md)** - Resume, Profile (REST)
- **[services/audit-service.md](services/audit-service.md)** - Compliance logging (ClickHouse, 5yr retention)
- **[services/analytics-service.md](services/analytics-service.md)** - Business analytics (ClickHouse, MVs)

### Frontend Apps (Implemented)

- **[apps/web-main.md](apps/web-main.md)** - Main web application (React + Vite)
- **[apps/storybook.md](apps/storybook.md)** - Storybook component documentation

### Shared Packages

- **[packages/design-tokens.md](packages/design-tokens.md)** - WCAG 2.1 AAA design tokens (SSOT)
- **[packages/nest-common.md](packages/nest-common.md)** - Shared NestJS utilities (guards, decorators, gRPC)
- **[packages/types.md](packages/types.md)** - TypeScript types + Protobuf
- **[packages/ui-components.md](packages/ui-components.md)** - React UI components

## Task-Based Navigation

**"I need to add authentication..."**
→ Read: `rules.md` + `architecture.md` + `services/auth-service.md`
→ Future: `services/identity-service.md`

**"I need to work on Identity Platform..."**
→ Read: `services/identity-service.md` + `architecture.md`
→ Policy: `docs/policies/IDENTITY_PLATFORM.md`

**"I need to work on resume..."**
→ Read: `rules.md` + `services/personal-service.md`

**"I need to update the web frontend..."**
→ Read: `rules.md` + `apps/web-main.md`

**"I need to set up the project..."**
→ Read: `project-setup.md`

**"I need to deploy with Docker..."**
→ Read: `docker-deployment.md`

**"I need to deploy to Kubernetes..."**
→ Read: `helm-deployment.md`

**"I need to understand Git workflow..."**
→ Read: `git-flow.md`

**"I need to setup CI/CD..."**
→ Read: `ci-cd.md`

**"I need to manage database migrations..."**
→ Read: `database.md`

**"I need testing/security/performance info..."**
→ Read: `testing.md` or refer to `docs/policies/` for detailed documentation

**"I need to implement caching..."**
→ Read: `caching.md`
→ Full guide: `docs/policies/CACHING.md`

**"I need to create a new NestJS service..."**
→ Read: `rules.md` + `packages/nest-common.md`

**"I need to add design tokens or styling..."**
→ Read: `ssot.md` + `packages/design-tokens.md` + `docs/DESIGN_SYSTEM.md`

**"I need to work on i18n or locale settings..."**
→ Read: `i18n-locale.md` + `apps/web-main.md`

**"I need to work on resume features..."**
→ Read: `resume.md` + `services/personal-service.md`

**"I need to work on Storybook..."**
→ Read: `apps/storybook.md`

**"I need to create a PR..."**
→ Read: `pull-requests.md` + `git-flow.md`

**"I need to work on legal/consent features..."**
→ Read: `services/auth-service.md` (Legal API section) + `packages/types.md` (Legal Types)
→ Policy: `docs/policies/LEGAL_CONSENT.md`

**"I need to work on ads/promotions..."**
→ Read: `apps/web-main.md` (Advertisement section)
→ Full guide: `docs/guides/ADSENSE_GUIDE.md`

## Identity Platform Strategy

**Key Principle**: Services combined (operational simplicity) + DBs pre-separated (future extraction)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Identity Service (Combined)                   │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│   │  Identity   │   │    Auth     │   │    Legal    │           │
│   │   Module    │   │   Module    │   │   Module    │           │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
└──────────┼─────────────────┼─────────────────┼───────────────────┘
           ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │identity_db │    │  auth_db   │    │  legal_db  │
    └────────────┘    └────────────┘    └────────────┘
```

**Service Evolution:**

| Phase   | State                           | DBs |
| ------- | ------------------------------- | --- |
| Current | auth-service (all-in-one)       | 1   |
| Next    | identity-service (combined)     | 3   |
| Future  | 3 separate services (if needed) | 3   |

**Global Law Coverage:** PIPA (KR), GDPR (EU), CCPA (US), APPI (JP)

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Cilium Gateway API                        │
│  api.girok.dev │ accounts.girok.dev │ my.girok.dev         │
└──────────┬─────────────┬────────────────────────────────────┘
           │             │
    ┌──────▼──────┐  ┌───▼────────┐  ┌────────────┐  ┌────────────┐
    │Auth Service │  │  Personal  │  │   Audit    │  │ Analytics  │
    │ (REST+gRPC) │  │  Service   │  │  Service   │  │  Service   │
    │ PostgreSQL  │  │ PostgreSQL │  │ ClickHouse │  │ ClickHouse │
    └─────────────┘  └────────────┘  └────────────┘  └────────────┘
           │               │               │               │
           └───────────────┴───────────────┴───────────────┘
                                   │
                            ┌──────▼──────┐
                            │   Valkey    │
                            │ (Caching)   │
                            └─────────────┘
```

**Planned (Not Implemented):**

- Identity Service (replaces auth-service)
- GraphQL BFF (Federation Gateway)
- WS Gateway (Socket.io)
- Feed Service (MongoDB)
- Chat Service (MongoDB)
- Matching Service (Valkey)
- Media Service (MinIO)
- LLM API (Python FastAPI)

## Token Optimization

- **This directory (.ai/)**: ~5K tokens (patterns, APIs, flows)
- **Full docs (docs/)**: ~73K tokens (detailed policies, tutorials)

**Read .ai/ for coding tasks, refer to docs/ for learning/policies.**

## File Format

Each service/app file contains:

1. **Purpose** - What this service does
2. **Tech Stack** - Technologies used
3. **API/gRPC Endpoints** - Key routes and methods
4. **Key Flows** - Important business logic flows
5. **Integration** - How it connects to other services

Keep it concise, pattern-focused, and example-driven.
