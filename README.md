# My-Girok

> Personal Information Management Platform

A comprehensive personal management platform for organizing professional profiles, resumes, and more. Built with TypeScript, NestJS, Prisma, and React.

![Node](https://img.shields.io/badge/node-24.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)
![NestJS](https://img.shields.io/badge/nestjs-11-red.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)

## Features

- **Resume Management**: Multiple resumes, work experience, education, skills, certifications
- **File Attachments**: Profile photos, portfolios, certificates (MinIO storage)
- **Sharing**: Public URLs, time-limited share links with analytics
- **Multi-Provider Auth**: Local, Google, Kakao, Naver OAuth
- **RBAC**: Role-based access control with H-RBAC hierarchy
- **Legal Compliance**: GDPR, PIPA, CCPA, APPI consent management

## Tech Stack

| Layer     | Technology                                         |
| --------- | -------------------------------------------------- |
| Frontend  | React 19.2, Vite 7.3, TypeScript 5.9, Tailwind 4.1 |
| Backend   | Node.js 24, NestJS 11.1, Prisma 7                  |
| Database  | PostgreSQL 16, ClickHouse (analytics/audit)        |
| Cache     | Valkey (Redis-compatible)                          |
| Messaging | Redpanda (Kafka-compatible)                        |
| Storage   | MinIO (S3-compatible)                              |
| Infra     | Kubernetes, Helm, ArgoCD, Cilium Gateway           |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start with Docker Compose
cp docker-compose.yml.example docker-compose.yml
docker compose up -d

# Or start manually
pnpm dev
```

**Access:**

- Web App: http://localhost:3000
- Auth Service: http://localhost:3001/api/docs
- Personal Service: http://localhost:3002/api/docs

## Project Structure

```
my-girok/
├── apps/
│   ├── web-girok/             # React web app
│   ├── web-admin/            # Admin dashboard
│   └── storybook/            # Component library
├── services/
│   ├── identity-service/     # Accounts, sessions, devices
│   ├── auth-service/         # RBAC, operators, sanctions
│   ├── legal-service/        # Consents, DSR, law registry
│   ├── personal-service/     # Resume management
│   ├── audit-service/        # Compliance logging (ClickHouse)
│   └── analytics-service/    # Business analytics (ClickHouse)
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── proto/                # Protobuf definitions
│   ├── nest-common/          # NestJS utilities
│   └── ui-components/        # React components
├── .ai/                      # LLM-optimized docs
└── docs/                     # Detailed documentation
```

## Services

| Service   | REST  | gRPC  | Database      | Description                 |
| --------- | ----- | ----- | ------------- | --------------------------- |
| identity  | :3000 | 50051 | identity_db   | Accounts, sessions, devices |
| auth      | :3001 | 50052 | auth_db       | RBAC, operators, sanctions  |
| legal     | :3005 | 50053 | legal_db      | Consents, DSR, law registry |
| personal  | :3002 | -     | personal_db   | Resume management           |
| audit     | :3003 | -     | audit_db (CH) | Compliance logging          |
| analytics | :3004 | -     | analytics_db  | Business analytics          |

## Development

```bash
# Run all tests
pnpm test

# Run specific service
pnpm --filter auth-service dev

# Database migrations
goose -dir migrations/{service} postgres "$DATABASE_URL" up

# Build all
pnpm build
```

## Git Flow

```
feat/* ──squash──> develop ──merge──> release ──merge──> main
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Documentation

| Type        | Location    | Purpose                        |
| ----------- | ----------- | ------------------------------ |
| AI docs     | `.ai/`      | LLM-optimized, patterns & APIs |
| Human docs  | `docs/`     | Detailed guides & policies     |
| Entry point | `CLAUDE.md` | AI assistant navigation        |

### Key Documents

- [Architecture](./.ai/architecture.md)
- [Database Migrations](./.ai/database.md)
- [Testing Guide](./.ai/testing.md)
- [CI/CD Pipeline](./docs/CI_CD.md)

### Service Documentation

- [Identity Service](./.ai/services/identity-service.md)
- [Auth Service](./.ai/services/auth-service.md)
- [Legal Service](./.ai/services/legal-service.md)
- [Personal Service](./.ai/services/personal-service.md)
- [Audit Service](./.ai/services/audit-service.md)
- [Analytics Service](./.ai/services/analytics-service.md)

## Security

- Never commit credentials
- Use environment variables
- HTTPS-only in production
- Rate limiting enabled
- Input validation with class-validator

**Report vulnerabilities**: beegy.net@gmail.com

## License

MIT License - see [LICENSE](LICENSE)
