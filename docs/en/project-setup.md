# Project Setup

> Quick start guide for local development environment

## Prerequisites

- Node.js 24
- pnpm 9
- Docker and Docker Compose
- PostgreSQL 16 (via Docker or local)
- Redis/Valkey 7 (via Docker or local)

## Quick Start

```bash
git clone https://github.com/your-org/my-girok.git && cd my-girok
pnpm install
cp docker-compose.yml.example docker-compose.yml
cp services/auth-service/.env.example services/auth-service/.env
docker compose up -d
```

## Config Files

| File                         | Contains       | Commit |
| ---------------------------- | -------------- | ------ |
| `.env.example`               | Template       | Yes    |
| `.env`                       | Actual secrets | No     |
| `docker-compose.yml.example` | Template       | Yes    |
| `docker-compose.yml`         | Actual config  | No     |
| `helm/values.yaml.example`   | Template       | Yes    |
| `helm/values.yaml`           | Actual config  | No     |

**Important**: Files ending in `.example` are templates committed to the repository. Copy them and remove the `.example` suffix for local use. Never commit files containing actual secrets.

## Commands

### Development

```bash
# Development
pnpm dev
cd services/auth-service && pnpm dev
cd apps/web-main && pnpm dev
```

### Database

```bash
# Database
pnpm prisma studio
pnpm prisma db push
pnpm prisma migrate dev
```

### Testing

```bash
# Testing
pnpm test
pnpm test:cov
```

### Docker

```bash
# Docker
docker compose up -d
docker compose logs -f
docker compose down
```

### Kubernetes

```bash
# Kubernetes
helm install my-girok-auth services/auth-service/helm -f values.yaml
```

## Project Structure

```
my-girok/
  docs/{.ai/, llm/, en/, kr/}
  apps/web-main/           # React 19.2 + Vite 7.2
  services/auth-service/   # NestJS 11 + Prisma 6
  packages/types/          # Shared types
```

## Technology Stack

```yaml
Backend: Node.js 24, NestJS 11, TypeScript 5.9, Prisma 6
Frontend: React 19.2, Vite 7.2, Tailwind CSS 4.1
Database: PostgreSQL 16, Redis 7
Deploy: Docker, Kubernetes (Helm)
Monorepo: pnpm 9, Turborepo 2
```

---

**LLM Reference**: `docs/llm/project-setup.md`
