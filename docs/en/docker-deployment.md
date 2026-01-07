# Docker Deployment

> Docker Compose configuration for local development

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 2GB+ RAM available
- 10GB+ disk space

## Quick Start

```bash
# Copy environment template
cp .env.example .env

# Start all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Access Points

| Service      | URL                            |
| ------------ | ------------------------------ |
| Web App      | http://localhost:3000          |
| Auth API     | http://localhost:3001          |
| API Docs     | http://localhost:3001/api/docs |
| PostgreSQL   | localhost:5432                 |
| Redis/Valkey | localhost:6379                 |

## Environment Configuration

```env
DB_USER=dev_girok_user
DB_PASSWORD=your-password
DATABASE_URL=postgresql://dev_girok_user:your-password@localhost:5432/dev_girok
JWT_SECRET=your-jwt-secret-min-32-chars
VITE_API_URL=http://localhost:3001
```

## Compose File Profiles

| File                       | Purpose                    |
| -------------------------- | -------------------------- |
| docker-compose.yml         | Base configuration         |
| docker-compose.dev.yml     | Hot reload for development |
| docker-compose.staging.yml | 2 replicas for staging     |
| docker-compose.prod.yml    | 3 replicas for production  |

## Common Commands

```bash
# Restart a specific service
docker compose restart auth-service

# Rebuild and restart a service
docker compose up -d --build auth-service

# Scale a service
docker compose up -d --scale auth-service=3

# Access PostgreSQL CLI
docker compose exec postgres psql -U dev_girok_user

# Backup database
docker compose exec postgres pg_dump -U dev_girok_user dbname > backup.sql

# Clean up everything (including volumes and images)
docker compose down -v --rmi all
```

## Health Checks

```yaml
PostgreSQL: pg_isready -U dev_girok_user
Redis: redis-cli ping
Auth Service: curl localhost:3001/api/v1/health
```

## Troubleshooting

| Issue                | Solution                                                      |
| -------------------- | ------------------------------------------------------------- |
| Service won't start  | Check logs: `docker compose logs <service>`                   |
| DB connection failed | Verify DB is ready: `docker compose exec postgres pg_isready` |
| Port already in use  | Find process: `lsof -i :3001`, then kill: `kill -9 <PID>`     |
| Out of memory        | Check usage: `docker stats`, increase Docker memory           |

## Production Checklist

Before deploying to production:

- [ ] Use external managed database (RDS, Cloud SQL)
- [ ] Use external Redis/Valkey (ElastiCache, MemoryStore)
- [ ] Configure SSL/TLS certificates
- [ ] Set up reverse proxy (nginx, Traefik)
- [ ] Enable monitoring and alerting
- [ ] Configure centralized log aggregation
- [ ] Set up automated backups
- [ ] Review and rotate secrets

---

**LLM Reference**: `docs/llm/DOCKER_DEPLOYMENT.md`
