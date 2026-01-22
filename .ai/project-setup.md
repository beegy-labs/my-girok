# Project Setup

> Quick start guide | **Last Updated**: 2026-01-11

## Initial Setup

```bash
git clone https://github.com/your-org/my-girok.git
cd my-girok
pnpm install
cp docker-compose.yml.example docker-compose.yml
docker compose up -d
```

## Key Commands

| Purpose   | Command                |
| --------- | ---------------------- |
| Dev (all) | `pnpm dev`             |
| Test      | `pnpm test`            |
| Build     | `pnpm build`           |
| Docker    | `docker compose up -d` |

## Config Files

| File                 | Purpose      | Commit? |
| -------------------- | ------------ | ------- |
| `*.example`          | Templates    | Yes     |
| `.env`               | Secrets      | No      |
| `docker-compose.yml` | Local config | No      |
| `helm/values.yaml`   | K8s config   | No      |

## Stack

| Category | Technology                         |
| -------- | ---------------------------------- |
| Backend  | Node.js 24, NestJS 11.1, Prisma 7  |
| Frontend | React 19.2, Vite 7.3, Tailwind 4.1 |
| Database | PostgreSQL 16, Valkey              |
| Monorepo | pnpm 9, Turborepo 2                |

**SSOT**: `docs/llm/project-setup.md`
