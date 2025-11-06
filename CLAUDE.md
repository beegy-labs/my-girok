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

**Working on content (posts/notes)?**
→ Read: `.ai/rules.md` + `.ai/services/content-api.md`

**Working on BFF layer?**
→ Read: `.ai/rules.md` + `.ai/architecture.md` + `.ai/services/web-bff.md` or `.ai/services/mobile-bff.md`

**Working on API Gateway?**
→ Read: `.ai/rules.md` + `.ai/services/api-gateway.md`

**Working on AI features?**
→ Read: `.ai/rules.md` + `.ai/services/llm-api.md`

### Frontend Development

**Working on web app?**
→ Read: `.ai/rules.md` + `.ai/apps/web-main.md`

**Working on admin dashboard?**
→ Read: `.ai/rules.md` + `.ai/apps/web-admin.md`

**Working on iOS app?**
→ Read: `.ai/rules.md` + `.ai/apps/ios.md`

**Working on Android app?**
→ Read: `.ai/rules.md` + `.ai/apps/android.md`

## Documentation Structure

```
my-girok/
├── CLAUDE.md                 # ← You are here (Entry point)
├── README.md                 # Project introduction
│
├── .ai/                      # 🤖 LLM-optimized docs (~10K tokens)
│   ├── README.md             # Navigation guide
│   ├── rules.md              # Core rules (READ FIRST)
│   ├── architecture.md       # Architecture patterns
│   ├── services/             # Backend service APIs
│   │   ├── auth-service.md
│   │   ├── content-api.md
│   │   ├── web-bff.md
│   │   ├── mobile-bff.md
│   │   ├── api-gateway.md
│   │   └── llm-api.md
│   └── apps/                 # Frontend app guides
│       ├── web-main.md
│       ├── web-admin.md
│       ├── ios.md
│       └── android.md
│
└── docs/                     # 📚 Human-readable docs (~73K tokens)
    ├── policies/             # Detailed policies
    │   ├── SECURITY.md
    │   ├── TESTING.md
    │   ├── PERFORMANCE.md
    │   └── DEPLOYMENT.md
    ├── guides/               # Tutorials
    └── api/                  # API specs
```

## Key Principles

### Language Policy
**ALL code, documentation, and commits MUST be in English**

### Git Commit Policy
**NEVER mention AI assistance in commit messages**
- Do NOT include "Generated with Claude" or similar references
- Do NOT add "Co-Authored-By: Claude" or AI attribution
- Write commit messages as if written by a human developer
- Keep commits professional and focused on the change itself

### Architecture
- Flexible multi-pattern (Gateway, BFF, REST, GraphQL coexist)
- Everything is optional and composable
- Services are independent

### Development
- Types first (`packages/types`)
- `@Transactional()` for multi-step DB ops
- 80% test coverage minimum
- Sealed Secrets for K8s

### Stack
- **Web**: Next.js 15, React 19, TypeScript, Tailwind
- **Mobile**: iOS (Swift), Android (Kotlin)
- **Backend**: Node.js 20, NestJS 10
- **Database**: PostgreSQL 16 + Prisma 5 + Redis
- **AI**: Python 3.11, FastAPI
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
