# Project Setup

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

## Commands

```bash
# Development
pnpm dev
cd services/auth-service && pnpm dev
cd apps/web-girok && pnpm dev

# Database
pnpm prisma studio
pnpm prisma db push
pnpm prisma migrate dev

# Testing
pnpm test
pnpm test:cov

# Docker
docker compose up -d
docker compose logs -f
docker compose down

# Kubernetes
helm install my-girok-auth services/auth-service/helm -f values.yaml
```

## Structure

```
my-girok/
  docs/{.ai/, llm/, en/, kr/}
  apps/web-girok/           # React 19.2 + Vite 7.3
  services/auth-service/   # NestJS 11.1 + Prisma 7
  packages/types/          # Shared types
```

## Stack

```yaml
Backend: Node.js 24, NestJS 11.1, TypeScript 5.9, Prisma 7
Frontend: React 19.2, Vite 7.3, Tailwind CSS 4.1
Database: PostgreSQL 16, Valkey 8
Deploy: Docker, Kubernetes (Helm)
Monorepo: pnpm 9, Turborepo 2
```
