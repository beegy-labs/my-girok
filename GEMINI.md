# GEMINI.md

> **AI Assistant Entry Point for my-girok project** | **Last Updated**: 2026-01-07

**Manifest**: [.ai/manifest.yaml](.ai/manifest.yaml) | **Changelog**: [.ai/CHANGELOG.md](.ai/CHANGELOG.md)

## Quick Start

**Start here**: [.ai/README.md](.ai/README.md) - Navigation for all AI documentation

## Essential Reading

**For ANY task, read these first:**

1. **[.ai/rules.md](.ai/rules.md)** - Core DO/DON'T rules (CRITICAL)
2. **[.ai/best-practices.md](.ai/best-practices.md)** - 2026 Best Practices (monthly review)
3. **[.ai/architecture.md](.ai/architecture.md)** - Architecture patterns and routing
4. **[docs/llm/policies/testing.md](docs/llm/policies/testing.md)** - Test coverage status

## Documentation Policy (2026) - CRITICAL

### 4-Tier Structure

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

| Tier | Path        | Editable | Format                      |
| ---- | ----------- | -------- | --------------------------- |
| 1    | `.ai/`      | **Yes**  | Tables, links, max 50 lines |
| 2    | `docs/llm/` | **Yes**  | YAML, tables, code (SSOT)   |
| 3    | `docs/en/`  | **No**   | Prose, examples (generated) |
| 4    | `docs/kr/`  | **No**   | Korean translation          |

### Edit Rules

| DO                                          | DO NOT                   |
| ------------------------------------------- | ------------------------ |
| Edit `.ai/` directly                        | Edit `docs/en/` directly |
| Edit `docs/llm/` directly                   | Edit `docs/kr/` directly |
| Run `pnpm docs:generate` after llm/ changes | Skip generation step     |
| Run `pnpm docs:translate` after en/ changes | Skip translation step    |

### Generation Flow

```bash
# 1. Edit SSOT
vim docs/llm/services/example.md

# 2. Generate English docs
pnpm docs:generate                    # docs/llm → docs/en

# 3. Translate to Korean
pnpm docs:translate --locale kr       # docs/en → docs/kr
```

**Full policy**: `docs/llm/policies/documentation-architecture.md`

## Task-Based Navigation

### Backend Development

**Working on authentication?**
Read: `.ai/rules.md` + `.ai/services/auth-service.md`

**Working on Identity Platform?**
Read: `.ai/services/identity-service.md` + `.ai/architecture.md`

**Working on resume/profile?**
Read: `.ai/rules.md` + `.ai/services/personal-service.md`

### Frontend Development

**Working on web app?**
Read: `.ai/rules.md` + `.ai/apps/web-main.md`

**Working on design tokens/styling?**
Read: `.ai/ssot.md` + `.ai/packages/design-tokens.md`

### Database & Deployment

**Working on database migrations?**
Read: `.ai/database.md` + `.ai/rules.md`

**Working on Helm/Kubernetes?**
Read: `.ai/helm-deployment.md` + `.ai/ci-cd.md`

## Directory Structure

```
my-girok/
├── GEMINI.md                 # <- You are here (Entry point)
├── CLAUDE.md                 # Claude entry point
├── README.md                 # Project introduction
│
├── .ai/                      # LLM-optimized docs (EDITABLE)
│   ├── README.md             # Navigation guide
│   ├── rules.md              # Core rules (READ FIRST)
│   ├── manifest.yaml         # Machine-readable contract
│   ├── CHANGELOG.md          # Documentation changelog
│   ├── services/             # Backend service APIs
│   ├── packages/             # Shared packages
│   └── apps/                 # Frontend app guides
│
├── docs/llm/                 # SSOT - LLM optimized (EDITABLE)
│   ├── policies/             # Policy definitions
│   ├── services/             # Service documentation
│   └── guides/               # Technical guides
│
├── docs/en/                  # Human-readable (GENERATED - DO NOT EDIT)
└── docs/kr/                  # Korean translation (GENERATED - DO NOT EDIT)
```

## Key Principles

### Language Policy

**ALL code, documentation, and commits MUST be in English**

### Git Branch & Merge Policy (GitFlow Standard)

```
feat/* ──squash──> develop ──merge──> release ──merge──> main
                    (Dev)    (Staging)   (Prod)
```

Full details: [.ai/git-flow.md](.ai/git-flow.md)

### Git Commit Policy

**NEVER mention AI assistance in commit messages**

- Do NOT include "Generated with Gemini" or similar
- Do NOT add AI attribution
- Write as human developer

### Architecture

- Full BFF Pattern (IETF recommended, session-based auth)
- GraphQL Federation for API aggregation
- gRPC for internal service communication
- Redpanda for event-driven messaging (Kafka-compatible, no JVM)
- Cilium Gateway API for edge routing

### Development Rules

- Types first (`packages/types`)
- `@Transactional()` for multi-step DB ops
- 80% test coverage minimum
- Sealed Secrets for K8s

### Stack (2026)

| Category | Technology                                         |
| -------- | -------------------------------------------------- |
| Web      | React 19.2, TypeScript 5.9, Tailwind 4.1, Vite 7.2 |
| Backend  | Node.js 24, NestJS 11                              |
| Database | PostgreSQL 16, Prisma 6, Valkey                    |
| AI       | Python 3.13, FastAPI                               |
| Deploy   | Kubernetes, Kustomize                              |

## Detailed Policies

| Policy              | Location                                          |
| ------------------- | ------------------------------------------------- |
| Best Practices 2026 | `docs/llm/policies/best-practices-2026.md`        |
| Security            | `docs/llm/policies/security.md`                   |
| Testing             | `docs/llm/policies/testing.md`                    |
| Database            | `docs/llm/policies/database.md`                   |
| Documentation       | `docs/llm/policies/documentation-architecture.md` |

---

**Ready to code? Start with [.ai/README.md](.ai/README.md)**
