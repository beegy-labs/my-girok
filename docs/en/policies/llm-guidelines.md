# LLM Guidelines

> Documentation standards and development rules for AI assistants

## Language Policy

**ALL documentation must be in English:**

- README files
- API documentation
- Code comments
- Commit messages

## Documentation Structure

| Directory | Purpose                | Primary Audience |
| --------- | ---------------------- | ---------------- |
| .ai/      | Token-optimized docs   | LLM assistants   |
| docs/     | Detailed documentation | Humans + LLM     |

## Auto-Update Rules

| Change Type        | Update .ai/        | Update docs/       |
| ------------------ | ------------------ | ------------------ |
| New component/hook | apps/ or packages/ | -                  |
| New API endpoint   | services/          | -                  |
| New pattern        | rules.md           | -                  |
| Major feature      | Relevant file      | guides/            |
| New policy         | rules.md summary   | policies/ full doc |

## Technology Stack

| Category  | Technologies                                            |
| --------- | ------------------------------------------------------- |
| Web       | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind CSS 4.1  |
| Mobile    | iOS (Swift), Android (Kotlin), Flutter (cross-platform) |
| Backend   | Node.js 24, NestJS 11                                   |
| Database  | PostgreSQL 16, Prisma 6, Valkey 8                       |
| Gateway   | Cilium Gateway API                                      |
| Protocols | GraphQL (external), gRPC (internal), NATS               |

## Architecture Overview

```
Client -> GraphQL BFF -> gRPC -> Services -> Database
                |
          NATS JetStream
```

**Full BFF Pattern**: Session cookies managed by BFF, tokens never exposed to browser.

## Project Structure

```
my-girok/
├── apps/
│   └── web-girok/               # Public web application
├── services/
│   ├── auth-service/           # Authentication/authorization
│   ├── identity-service/       # User identity
│   ├── personal-service/       # User data, resumes
│   └── ...
└── packages/
    ├── types/                  # Shared TypeScript types
    ├── nest-common/            # NestJS utilities
    └── design-tokens/          # UI design tokens
```

## Mandatory Rules

### NEVER

- Duplicate types (use packages/types)
- Put Prisma calls in Controllers
- Use HTTP between services (use gRPC)
- Expose tokens to browser
- Remove analytics script
- Write non-English documentation
- Commit secrets or credentials

### ALWAYS

- Define types first in packages/types
- Validate DTOs with class-validator
- Use @Transactional() for multi-step DB operations
- Apply Guards for protected endpoints
- Maintain 80% test coverage minimum

## Commit Message Format

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, docs, test, chore, perf
```

**CRITICAL**: Never mention AI assistance in commit messages.

## Deployment

```bash
# Staging
kubectl apply -k k8s/overlays/staging

# Production
kubectl apply -k k8s/overlays/production
```

---

**LLM Reference**: `docs/llm/policies/LLM_GUIDELINES.md`
