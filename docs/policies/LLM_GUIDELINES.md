# LLM Guidelines

> Quick reference for AI assistants

## Documentation Policy

**ALL documentation MUST be in English**: README, API docs, code comments, commits.

### Documentation Structure

| Directory | Purpose                      | Audience      | Content                     |
| --------- | ---------------------------- | ------------- | --------------------------- |
| `.ai/`    | Token-optimized LLM docs     | AI assistants | Patterns, APIs, examples    |
| `docs/`   | Detailed human-readable docs | Human + LLM   | Policies, guides, tutorials |

### Automatic Documentation Updates

**Code changes MUST include documentation updates.** No confirmation needed.

| Change Type            | `.ai/` Update                 | `docs/` Update          |
| ---------------------- | ----------------------------- | ----------------------- |
| New component/hook     | Add to `apps/` or `packages/` | -                       |
| New API endpoint       | Add to `services/`            | -                       |
| New pattern/convention | Add to `rules.md`             | -                       |
| New feature (major)    | Add section to relevant file  | Add to `guides/`        |
| New policy             | Summary in `rules.md`         | Full doc in `policies/` |
| Breaking change        | Update affected files         | Update affected files   |

**Principle**: `.ai/` = concise (what, how), `docs/` = detailed (why, deep dive).

## Stack

| Category  | Technology                                             |
| --------- | ------------------------------------------------------ |
| Web       | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind CSS 4.1 |
| Mobile    | iOS (Swift), Android (Kotlin), Flutter                 |
| Backend   | Node.js 24, NestJS 11                                  |
| Database  | PostgreSQL 16, Prisma 6, Valkey 8                      |
| Gateway   | Cilium Gateway API                                     |
| Protocols | GraphQL (external), gRPC (internal), NATS JetStream    |

## Architecture

```
Client → GraphQL BFF → gRPC → Domain Services → Database
                  ↓
            NATS JetStream (events)
```

**Full BFF Pattern**: Session cookies, tokens never exposed to browser.

## Project Structure

```
my-girok/
├── apps/web-main/          # React SPA
├── services/
│   ├── auth-service/       # REST + gRPC
│   └── personal-service/   # REST + gRPC
└── packages/
    ├── types/              # Shared types
    └── nest-common/        # NestJS utilities
```

## Critical Rules

**NEVER:**

- Duplicate types (use `packages/types`)
- Prisma in Controllers (use Services)
- HTTP calls between services (use gRPC)
- Expose tokens to browser
- Remove analytics script
- Write docs in non-English
- Commit secrets

**ALWAYS:**

- Define types first in `packages/types`
- Use DTO validation
- Use `@Transactional()` for multi-step DB
- Use Guards for protected endpoints
- Write tests (80% coverage)

## Commit Format

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, docs, test, chore, perf
```

**NEVER mention AI assistance in commits.**

## Deployment

```bash
kubectl apply -k k8s/overlays/staging     # Staging
kubectl apply -k k8s/overlays/production  # Production
```

## Related Docs

- **Security**: `docs/policies/SECURITY.md`
- **Testing**: `docs/policies/TESTING.md`
- **Performance**: `docs/policies/PERFORMANCE.md`
- **Deployment**: `docs/policies/DEPLOYMENT.md`
