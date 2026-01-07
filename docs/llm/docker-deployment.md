# Docker Deployment

Docker Compose for local development

## Prerequisites

Docker 24.0+, Docker Compose 2.20+, 2GB+ RAM, 10GB+ disk

## Quick Start

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker compose logs -f
docker compose down
```

## Access Points

| Service    | URL                     |
| ---------- | ----------------------- |
| Web App    | localhost:3000          |
| Auth API   | localhost:3001          |
| API Docs   | localhost:3001/api/docs |
| PostgreSQL | localhost:5432          |
| Redis      | localhost:6379          |

## Environment

```env
DB_USER=dev_girok_user
DB_PASSWORD=your-password
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret-min-32-chars
VITE_API_URL=http://localhost:3001
```

## Compose Files

| File                       | Purpose    |
| -------------------------- | ---------- |
| docker-compose.yml         | Base       |
| docker-compose.dev.yml     | Hot reload |
| docker-compose.staging.yml | 2 replicas |
| docker-compose.prod.yml    | 3 replicas |

## Commands

```bash
docker compose restart auth-service
docker compose up -d --build auth-service
docker compose up -d --scale auth-service=3
docker compose exec postgres psql -U dev_girok_user
docker compose exec postgres pg_dump ... > backup.sql
docker compose down -v --rmi all
```

## Health Checks

```yaml
PostgreSQL: pg_isready -U dev_girok_user
Redis: redis-cli ping
Auth: curl localhost:3001/api/v1/health
```

## Troubleshooting

| Issue                | Solution                                |
| -------------------- | --------------------------------------- |
| Service won't start  | docker compose logs <service>           |
| DB connection failed | docker compose exec postgres pg_isready |
| Port in use          | lsof -i :3001, kill -9 <PID>            |
| Out of memory        | docker stats, increase memory           |

## Production Checklist

- Use external managed DB (RDS)
- Use external Redis (ElastiCache)
- Configure SSL/TLS
- Set up reverse proxy
- Enable monitoring
- Configure log aggregation
- Set up backups
