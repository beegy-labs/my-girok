# Project Setup Quick Reference

## Initial Setup

```bash
# 1. Clone
git clone https://github.com/your-org/my-girok.git
cd my-girok

# 2. Install
pnpm install

# 3. Configure
cp docker-compose.yml.example docker-compose.yml
cp services/auth-service/.env.example services/auth-service/.env

# Edit with your settings
nano docker-compose.yml
nano services/auth-service/.env

# 4. Start
docker compose up -d

# OR manual
cd services/auth-service
pnpm prisma db push
pnpm dev
```

## Key Configuration Files

### `.env` (services/auth-service/)
- Database credentials
- JWT secrets (min 32 chars)
- OAuth credentials (optional)
- NEVER commit actual .env files

### `docker-compose.yml`
- Database credentials
- Container configuration
- Port mappings
- Volume mounts
- NEVER commit actual docker-compose.yml

### `helm/values.yaml`
- Kubernetes resources
- Ingress domains
- Replica counts
- NEVER commit actual values.yaml

## File Patterns

**Commit to Git:**
- `*.example` files
- Documentation
- Source code
- Dockerfiles

**Never Commit:**
- `.env`, `.env.*` (except .example)
- `docker-compose.yml` (only .example)
- `helm/values.yaml` (only .example)
- `secret.yaml`
- `*.pem`, `*.key`
- Sealed secrets (except templates)

## Quick Commands

```bash
# Development
pnpm dev                          # All services
cd services/auth-service && pnpm dev
cd apps/web-main && pnpm dev

# Database
pnpm prisma studio                # GUI
pnpm prisma db push               # Sync schema
pnpm prisma migrate dev           # Create migration

# Testing
pnpm test                         # All tests
pnpm test:cov                     # Coverage
cd apps/web-main && pnpm test:e2e # E2E

# Build
pnpm build                        # All
docker compose build              # Docker

# Docker
docker compose up -d              # Start
docker compose logs -f            # Logs
docker compose down               # Stop

# Kubernetes
helm install my-girok-auth services/auth-service/helm -f values.yaml
helm upgrade my-girok-auth services/auth-service/helm -f values.yaml
helm uninstall my-girok-auth
```

## Project Structure

```
my-girok/
├── .ai/                   # LLM instructions (concise)
├── docs/                  # Human documentation (detailed)
├── apps/
│   └── web-main/         # React 19.2 + Vite 7.2
├── services/
│   └── auth-service/     # NestJS 11 + Prisma 6
│       ├── helm/         # K8s deployment
│       └── Dockerfile
├── packages/
│   └── types/            # Shared TypeScript types
├── docker-compose.yml.example
├── .env.example
├── CONTRIBUTING.md       # Git Flow, standards
└── README.md            # Project overview
```

## Stack

- **Backend**: Node.js 24, NestJS 11, TypeScript 5.9, Prisma 6
- **Frontend**: React 19.2, Vite 7.2, Tailwind CSS 4.1
- **Database**: PostgreSQL 16, Redis 7
- **Testing**: Jest, Playwright
- **Deploy**: Docker, Kubernetes (Helm)
- **Monorepo**: pnpm 9, Turborepo 2
