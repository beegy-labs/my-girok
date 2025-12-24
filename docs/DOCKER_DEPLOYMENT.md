# Docker Deployment

> Docker Compose for local development

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 2GB+ RAM, 10GB+ disk

## Quick Start

```bash
# Clone and configure
cp .env.example .env

# Development (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Access Points

| Service    | URL                            |
| ---------- | ------------------------------ |
| Web App    | http://localhost:3000          |
| Auth API   | http://localhost:3001          |
| API Docs   | http://localhost:3001/api/docs |
| PostgreSQL | localhost:5432                 |
| Redis      | localhost:6379                 |

## Environment Variables

```env
# Database
DB_USER=dev_girok_user
DB_PASSWORD=your-password
DB_NAME=dev_girok_user
DATABASE_URL=postgresql://dev_girok_user:password@localhost:5432/dev_girok_user

# Application
NODE_ENV=development
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret

# Frontend
VITE_API_URL=http://localhost:3001
```

## Compose Files

| File                       | Purpose                     |
| -------------------------- | --------------------------- |
| docker-compose.yml         | Base configuration          |
| docker-compose.dev.yml     | Hot reload, exposed ports   |
| docker-compose.staging.yml | 2 replicas, resource limits |
| docker-compose.prod.yml    | 3 replicas, strict limits   |

## Commands

```bash
# Restart service
docker compose restart auth-service

# Rebuild
docker compose up -d --build auth-service

# Scale
docker compose up -d --scale auth-service=3

# Access DB
docker compose exec postgres psql -U dev_girok_user -d dev_girok_user

# Backup
docker compose exec postgres pg_dump -U dev_girok_user dev_girok_user > backup.sql

# Cleanup
docker compose down -v --rmi all
```

## Health Checks

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U dev_girok_user"]

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]

# Auth Service
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health')"]
```

## Troubleshooting

| Issue                | Solution                                  |
| -------------------- | ----------------------------------------- |
| Service won't start  | `docker compose logs <service>`           |
| DB connection failed | `docker compose exec postgres pg_isready` |
| Port in use          | `lsof -i :3001` then `kill -9 <PID>`      |
| Out of memory        | `docker stats`, increase Docker memory    |

## Production Checklist

- [ ] Use external managed DB (RDS)
- [ ] Use external Redis (ElastiCache)
- [ ] Configure SSL/TLS
- [ ] Set up reverse proxy
- [ ] Enable monitoring
- [ ] Configure log aggregation
- [ ] Set up backups

---

**For Kubernetes deployment**: See `docs/policies/DEPLOYMENT.md`
