# CLAUDE.md

> **AI Assistant Entry Point for my-girok project** | **Last Updated**: 2026-01-06

**Manifest**: [.ai/manifest.yaml](.ai/manifest.yaml) | **Changelog**: [.ai/CHANGELOG.md](.ai/CHANGELOG.md)

## Quick Start

**Start here**: [.ai/README.md](.ai/README.md) - Navigation for all AI documentation

## Essential Reading

**For ANY task, read these first:**

1. **[.ai/rules.md](.ai/rules.md)** - Core DO/DON'T rules (CRITICAL)
2. **[.ai/best-practices.md](.ai/best-practices.md)** - 2026 Best Practices (monthly review)
3. **[.ai/architecture.md](.ai/architecture.md)** - Architecture patterns and routing
4. **[docs/en/TEST_COVERAGE.md](docs/en/TEST_COVERAGE.md)** - Test coverage status & pending tests

### Testing Requirements

**All code changes MUST include tests.** Check `docs/en/TEST_COVERAGE.md` for:

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
Policy: `docs/en/policies/IDENTITY_PLATFORM.md`

**Working on resume/profile?**
Read: `.ai/rules.md` + `.ai/services/personal-service.md`

**Working on audit/compliance logging?**
Read: `.ai/rules.md` + `.ai/services/audit-service.md`
Full guide: `docs/en/services/AUDIT_SERVICE.md`

**Working on analytics/business intelligence?**
Read: `.ai/rules.md` + `.ai/services/analytics-service.md`
Full guide: `docs/en/services/ANALYTICS_SERVICE.md`

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
Policy: `docs/en/policies/DATABASE.md`

**Working on Helm/Kubernetes deployment?**
Read: `.ai/helm-deployment.md` + `.ai/ci-cd.md`

### Caching & Performance

**Working on caching with Valkey/Redis?**
Read: `.ai/caching.md`
Full guide: `docs/en/policies/CACHING.md`

### Other Tasks

**Creating a PR?**
Read: `.ai/pull-requests.md` + `.ai/git-flow.md`

**Working on resume features?**
Read: `.ai/resume.md` + `.ai/services/personal-service.md`

**Working on legal/consent features?**
Read: `.ai/services/auth-service.md` (Legal API section) + `.ai/packages/types.md`
Policy: `docs/en/policies/LEGAL_CONSENT.md`

**Adding fonts or external resources?**
Read: `.ai/packages/design-tokens.md` + `.ai/rules.md` (Resources section)
Policy: `docs/en/policies/EXTERNAL_RESOURCES.md`

## Documentation Structure

```
my-girok/
├── CLAUDE.md                 # <- You are here (Entry point)
├── README.md                 # Project introduction
│
├── .ai/                      # SSOT - LLM interface (token-optimized)
│   ├── README.md             # Navigation guide
│   ├── rules.md              # Core rules (READ FIRST)
│   ├── architecture.md       # Architecture patterns
│   ├── services/             # Service interfaces
│   └── packages/             # Package interfaces
│
└── docs/
    ├── llm/                  # SSOT - Structured data (YAML/JSON)
    │   ├── services/         # Service specs
    │   ├── policies/         # Policy data
    │   └── _meta/            # i18n config, glossary
    │
    ├── en/                   # PRIMARY - English (standard)
    │   ├── policies/         # Detailed policies
    │   ├── services/         # Service guides
    │   └── guides/           # Tutorials
    │
    └── kr/                   # TRANSLATED - Korean (CI translation)
        ├── policies/
        ├── services/
        └── guides/
```

### Docs-as-Code Architecture

| Layer            | Path        | Role                                  |
| ---------------- | ----------- | ------------------------------------- |
| SSOT (Interface) | `.ai/`      | LLM-optimized markdown (30-50 lines)  |
| SSOT (Data)      | `docs/llm/` | Machine-readable YAML/JSON            |
| PRIMARY          | `docs/en/`  | English documentation (standard)      |
| TRANSLATED       | `docs/kr/`  | Korean documentation (CI translation) |

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

**2026 Best Practices** -> `docs/en/policies/BEST_PRACTICES_2026.md`
**Database migrations** -> `docs/en/policies/DATABASE.md`
**Security policies** -> `docs/en/policies/SECURITY.md`
**Testing standards** -> `docs/en/policies/TESTING.md`
**Performance tips** -> `docs/en/policies/PERFORMANCE.md`
**Deployment guide** -> `docs/en/policies/DEPLOYMENT.md`
**External resources** -> `docs/en/policies/EXTERNAL_RESOURCES.md`

## Token Optimization

- **Read .ai/ for coding** - Patterns, APIs, flows
- **Refer to docs/en/ for policies** - Detailed guides, tutorials

**Always prefer .ai/ documentation for implementation tasks.**

---

**Ready to code? Start with [.ai/README.md](.ai/README.md)**
