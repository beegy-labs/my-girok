# LLM Guidelines

## Language

ALL documentation in English: README, API docs, comments, commits.

## Docs Structure

| Dir   | Purpose         | Audience    |
| ----- | --------------- | ----------- |
| .ai/  | Token-optimized | LLM         |
| docs/ | Detailed        | Human + LLM |

## Auto-Update

| Change             | .ai/               | docs/          |
| ------------------ | ------------------ | -------------- |
| New component/hook | apps/ or packages/ | -              |
| New API            | services/          | -              |
| New pattern        | rules.md           | -              |
| Major feature      | Relevant file      | guides/        |
| New policy         | rules.md summary   | policies/ full |

## Stack

| Category  | Tech                                       |
| --------- | ------------------------------------------ |
| Web       | React 19.2, Vite 7.3, TS 5.9, Tailwind 4.1 |
| Mobile    | iOS (Swift), Android (Kotlin), Flutter     |
| Backend   | Node.js 24, NestJS 11.1                    |
| Database  | PostgreSQL 16, Prisma 7, Valkey 8          |
| Gateway   | Cilium Gateway API                         |
| Protocols | GraphQL (external), gRPC (internal), NATS  |

## Architecture

```
Client -> GraphQL BFF -> gRPC -> Services -> DB
                 |
           NATS JetStream
```

Full BFF: Session cookies, tokens never to browser.

## Structure

```
my-girok/
├── apps/web-girok/
├── services/{auth,personal}-service/
└── packages/{types,nest-common}/
```

## Rules

### NEVER

- Duplicate types (use packages/types)
- Prisma in Controllers
- HTTP between services (use gRPC)
- Expose tokens to browser
- Remove analytics script
- Non-English docs
- Commit secrets

### ALWAYS

- Types first in packages/types
- DTO validation
- @Transactional() for multi-step DB
- Guards for protected endpoints
- 80% test coverage

## Commit

```
<type>(<scope>): <subject>
Types: feat, fix, refactor, docs, test, chore, perf
```

NEVER mention AI in commits.

## Deploy

```bash
kubectl apply -k k8s/overlays/{staging,production}
```
