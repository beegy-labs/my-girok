# CLAUDE.md

> **AI Assistant Entry Point for my-girok project**

## Quick Start

👉 **Start here**: [.ai/README.md](.ai/README.md) - Navigation for all AI documentation

## Essential Reading

**For ANY task, read these first:**

1. **[.ai/rules.md](.ai/rules.md)** - Core DO/DON'T rules (CRITICAL)
2. **[.ai/architecture.md](.ai/architecture.md)** - Architecture patterns and routing

## Task-Based Navigation

### Backend Development

**Working on authentication?**
→ Read: `.ai/rules.md` + `.ai/services/auth-service.md`

**Working on GraphQL BFF?**
→ Read: `.ai/rules.md` + `.ai/architecture.md` + `.ai/services/graphql-bff.md`

**Working on WebSocket/real-time?**
→ Read: `.ai/rules.md` + `.ai/services/ws-gateway.md`

**Working on feed/timeline?**
→ Read: `.ai/rules.md` + `.ai/services/feed-service.md`

**Working on chat?**
→ Read: `.ai/rules.md` + `.ai/services/chat-service.md`

**Working on random matching?**
→ Read: `.ai/rules.md` + `.ai/services/matching-service.md`

**Working on resume/profile?**
→ Read: `.ai/rules.md` + `.ai/services/personal-service.md`

**Working on AI features?**
→ Read: `.ai/rules.md` + `.ai/services/llm-api.md`

### Frontend Development

**Working on web app?**
→ Read: `.ai/rules.md` + `.ai/apps/web-main.md`

**Working on admin dashboard?**
→ Read: `.ai/rules.md` + `.ai/apps/web-admin.md`

**Working on mobile app (Flutter)?**
→ Read: `.ai/rules.md` + `.ai/apps/mobile-flutter.md`

**Working on design tokens/styling?**
→ Read: `.ai/ssot.md` + `.ai/packages/design-tokens.md`

## Documentation Structure

```
my-girok/
├── CLAUDE.md                 # ← You are here (Entry point)
├── README.md                 # Project introduction
│
├── .ai/                      # 🤖 LLM-optimized docs (~10K tokens)
│   ├── README.md             # Navigation guide
│   ├── rules.md              # Core rules (READ FIRST)
│   ├── architecture.md       # Architecture patterns (2025)
│   ├── ssot.md               # Single Source of Truth strategy (2025)
│   ├── services/             # Backend service APIs
│   │   ├── graphql-bff.md    # GraphQL Federation Gateway
│   │   ├── ws-gateway.md     # WebSocket Gateway
│   │   ├── auth-service.md   # Authentication (REST + gRPC)
│   │   ├── personal-service.md # Resume, Profile
│   │   ├── feed-service.md   # Timeline, Posts
│   │   ├── chat-service.md   # Messages, Rooms
│   │   ├── matching-service.md # Random matching
│   │   ├── media-service.md  # Image processing
│   │   └── llm-api.md        # AI features
│   ├── packages/             # Shared packages
│   │   ├── design-tokens.md  # WCAG 2.1 AAA design tokens (SSOT)
│   │   ├── nest-common.md
│   │   ├── types.md
│   │   └── ui-components.md
│   └── apps/                 # Frontend app guides
│       ├── web-main.md
│       ├── web-admin.md
│       └── mobile-flutter.md
│
└── docs/                     # 📚 Human-readable docs (~73K tokens)
    ├── policies/             # Detailed policies
    ├── guides/               # Tutorials (GraphQL, gRPC, NATS)
    └── api/                  # API specs
```

## Key Principles

### Language Policy

**ALL code, documentation, and commits MUST be in English**

### Git Branch & Merge Policy (GitFlow Standard)

```
feat/* ──squash──▶ develop ──merge──▶ release ──merge──▶ main
                    (Dev)    (Staging)   (Prod)
```

| Source → Target   | Merge Type | Command                |
| ----------------- | ---------- | ---------------------- |
| feat → develop    | Squash     | `gh pr merge --squash` |
| develop → release | Merge      | `gh pr merge --merge`  |
| release → main    | Merge      | `gh pr merge --merge`  |

👉 **Full details**: [.ai/git-flow.md](.ai/git-flow.md)

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
- NATS JetStream for event-driven messaging
- Cilium Gateway API for edge routing

### Development

- Types first (`packages/types`)
- `@Transactional()` for multi-step DB ops
- 80% test coverage minimum
- Sealed Secrets for K8s

### Stack

- **Web**: React 19.2, TypeScript 5.9, Tailwind CSS 4.1, Vite 7.2
- **Mobile**: iOS (Swift), Android (Kotlin)
- **Backend**: Node.js 24, NestJS 11
- **Database**: PostgreSQL 16 + Prisma 6 + Redis
- **AI**: Python 3.13, FastAPI
- **Deploy**: Kubernetes, Kustomize

## Need More Detail?

**Security policies** → `docs/policies/SECURITY.md`
**Testing standards** → `docs/policies/TESTING.md`
**Performance tips** → `docs/policies/PERFORMANCE.md`
**Deployment guide** → `docs/policies/DEPLOYMENT.md`

## Token Optimization

- **Read .ai/ for coding** (~10K tokens) - Patterns, APIs, flows
- **Refer to docs/ for policies** (~73K tokens) - Detailed guides, tutorials

**Always prefer .ai/ documentation for implementation tasks.**

---

**Ready to code? Start with [.ai/README.md](.ai/README.md) 🚀**
