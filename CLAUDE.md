# CLAUDE.md

> **AI Assistant Entry Point for my-girok project**

## Quick Start

**Start here**: [.ai/README.md](.ai/README.md) - Navigation for all AI documentation

## Essential Reading

**For ANY task, read these first:**

1. **[.ai/rules.md](.ai/rules.md)** - Core DO/DON'T rules (CRITICAL)
2. **[.ai/architecture.md](.ai/architecture.md)** - Architecture patterns and routing
3. **[docs/TEST_COVERAGE.md](docs/TEST_COVERAGE.md)** - Test coverage status & pending tests

### Testing Requirements

**All code changes MUST include tests.** Check `docs/TEST_COVERAGE.md` for:

- Current coverage status per service
- Pending tests that need to be written
- Files excluded from coverage (and why)

## Task-Based Navigation

### Backend Development

**Working on authentication?**
Read: `.ai/rules.md` + `.ai/services/auth-service.md`
Future: `.ai/services/identity-service.md`

**Working on Identity Platform (multi-app user management)?**
Read: `.ai/services/identity-service.md` + `.ai/architecture.md`
Policy: `docs/policies/IDENTITY_PLATFORM.md`

**Working on resume/profile?**
Read: `.ai/rules.md` + `.ai/services/personal-service.md`

**Working on audit/compliance logging?**
Read: `.ai/rules.md` + `.ai/services/audit-service.md`
Full guide: `docs/services/AUDIT_SERVICE.md`

**Working on analytics/business intelligence?**
Read: `.ai/rules.md` + `.ai/services/analytics-service.md`
Full guide: `docs/services/ANALYTICS_SERVICE.md`

### Frontend Development

**Working on web app?**
Read: `.ai/rules.md` + `.ai/apps/web-main.md`

**Working on design tokens/styling?**
Read: `.ai/ssot.md` + `.ai/packages/design-tokens.md`

**Working on Storybook?**
Read: `.ai/apps/storybook.md`

**Working on i18n/localization?**
Read: `.ai/i18n-locale.md` + `.ai/apps/web-main.md`

### Database & Deployment

**Working on database migrations?**
Read: `.ai/database.md` + `.ai/rules.md` (Database Migrations section)
Full guide: `docs/DATABASE.md`

**Working on Helm/Kubernetes deployment?**
Read: `.ai/helm-deployment.md` + `.ai/ci-cd.md`

### Caching & Performance

**Working on caching with Valkey/Redis?**
Read: `.ai/caching.md`
Full guide: `docs/policies/CACHING.md`

### Other Tasks

**Creating a PR?**
Read: `.ai/pull-requests.md` + `.ai/git-flow.md`

**Working on resume features?**
Read: `.ai/resume.md` + `.ai/services/personal-service.md`

**Working on legal/consent features?**
Read: `.ai/services/auth-service.md` (Legal API section) + `.ai/packages/types.md`
Policy: `docs/policies/LEGAL_CONSENT.md`

## Documentation Structure

```
my-girok/
├── CLAUDE.md                 # <- You are here (Entry point)
├── README.md                 # Project introduction
│
├── .ai/                      # LLM-optimized docs
│   ├── README.md             # Navigation guide
│   ├── rules.md              # Core rules (READ FIRST)
│   ├── architecture.md       # Architecture patterns (2025)
│   ├── caching.md            # Valkey/Redis caching patterns
│   ├── database.md           # goose + ArgoCD migration strategy
│   ├── ssot.md               # Single Source of Truth strategy
│   ├── i18n-locale.md        # Internationalization & Locale
│   ├── resume.md             # Resume feature documentation
│   ├── user-preferences.md   # User preferences system
│   ├── pull-requests.md      # PR guidelines
│   ├── services/             # Backend service APIs
│   │   ├── identity-service.md # Multi-app user platform (Future)
│   │   ├── auth-service.md   # Authentication (REST + Legal API)
│   │   ├── personal-service.md # Resume, Profile
│   │   ├── audit-service.md  # Compliance logging (ClickHouse)
│   │   └── analytics-service.md # Business analytics (ClickHouse)
│   ├── packages/             # Shared packages
│   │   ├── design-tokens.md  # WCAG 2.1 AAA design tokens (SSOT)
│   │   ├── nest-common.md
│   │   ├── types.md
│   │   └── ui-components.md
│   └── apps/                 # Frontend app guides
│       ├── web-main.md
│       └── storybook.md      # Storybook configuration
│
└── docs/                     # Human-readable docs
    ├── policies/             # Detailed policies
    ├── guides/               # Tutorials (GraphQL, gRPC, Redpanda)
    └── api/                  # API specs
```

## Key Principles

### Language Policy

**ALL code, documentation, and commits MUST be in English**

### Git Branch & Merge Policy (GitFlow Standard)

```
feat/* ──squash──> develop ──merge──> release ──merge──> main
                    (Dev)    (Staging)   (Prod)
```

| Source -> Target   | Merge Type | Command                |
| ------------------ | ---------- | ---------------------- |
| feat -> develop    | Squash     | `gh pr merge --squash` |
| develop -> release | Merge      | `gh pr merge --merge`  |
| release -> main    | Merge      | `gh pr merge --merge`  |

Full details: [.ai/git-flow.md](.ai/git-flow.md)

### Git Commit Policy

**NEVER mention AI assistance in commit messages**

- Do NOT include "Generated with Claude" or similar references
- Do NOT add "Co-Authored-By: Claude" or AI attribution
- Write commit messages as if written by a human developer
- Keep commits professional and focused on the change itself

### Architecture

- Full BFF Pattern (IETF recommended, session-based auth)
- GraphQL Federation for API aggregation
- gRPC for internal service communication
- Redpanda for event-driven messaging (Kafka-compatible, no JVM)
- Cilium Gateway API for edge routing

### Development

- Types first (`packages/types`)
- `@Transactional()` for multi-step DB ops
- 80% test coverage minimum
- Sealed Secrets for K8s

### Stack

- **Web**: React 19.2, TypeScript 5.9, Tailwind CSS 4.1, Vite 7.2
- **Mobile**: iOS (Swift), Android (Kotlin), Flutter (cross-platform)
- **Backend**: Node.js 24, NestJS 11
- **Database**: PostgreSQL 16 + Prisma 6 + Redis
- **AI**: Python 3.13, FastAPI
- **Deploy**: Kubernetes, Kustomize

## Need More Detail?

**Security policies** -> `docs/policies/SECURITY.md`
**Testing standards** -> `docs/policies/TESTING.md`
**Performance tips** -> `docs/policies/PERFORMANCE.md`
**Deployment guide** -> `docs/policies/DEPLOYMENT.md`

## Token Optimization

- **Read .ai/ for coding** - Patterns, APIs, flows
- **Refer to docs/ for policies** - Detailed guides, tutorials

**Always prefer .ai/ documentation for implementation tasks.**

---

**Ready to code? Start with [.ai/README.md](.ai/README.md)**
