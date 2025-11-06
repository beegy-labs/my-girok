# Docker Deployment Guide

Complete guide for deploying My-Girok using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Development Deployment](#development-deployment)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Docker Compose Files](#docker-compose-files)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 24.0+ installed
- Docker Compose 2.20+ installed
- At least 2GB RAM available
- At least 10GB disk space

### Installation

#### Linux
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### macOS
```bash
# Install Docker Desktop
brew install --cask docker

# Verify installation
docker --version
docker compose version
```

#### Windows
Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/my-girok.git
cd my-girok
```

### 2. Configure Environment

```bash
# Create .env file from example
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Start Services

```bash
# Development mode (with hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 4. Access Applications

- **Web Test App**: http://localhost:3000
- **Auth API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_USER=dev_girok_user
DB_PASSWORD=your-secure-password
DB_NAME=dev_girok_user
DB_PORT=5432

# Redis
REDIS_PORT=6379

# Application
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Frontend
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=http://localhost:3001/api/v1/auth/kakao/callback

NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_CALLBACK_URL=http://localhost:3001/api/v1/auth/naver/callback
```

## Development Deployment

### Using Dev Compose File

```bash
# Start all services in development mode
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f auth-service

# Restart specific service
docker compose restart auth-service

# Stop all services
docker compose down
```

### Features

- ✅ Hot reload enabled
- ✅ Source code mounted as volumes
- ✅ PostgreSQL and Redis included
- ✅ Ports exposed for debugging

### File Structure

```
docker-compose.yml          # Base configuration
docker-compose.dev.yml      # Development overrides
```

## Staging Deployment

### Using Staging Compose File

```bash
# Start staging environment
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Features

- ✅ Production build
- ✅ Multiple replicas (2 instances)
- ✅ Resource limits
- ✅ External database support

### Configuration

Update `.env` for staging:

```env
NODE_ENV=staging
DB_USER=girok_user
DB_PASSWORD=your-staging-password
DB_NAME=girok_user
DATABASE_URL=postgresql://girok_user:password@your-staging-db:5432/girok_user

JWT_SECRET=your-staging-jwt-secret
JWT_REFRESH_SECRET=your-staging-refresh-secret

FRONTEND_URL=https://staging.example.com
VITE_API_URL=https://auth-api-staging.example.com
```

## Production Deployment

### Using Production Compose File

```bash
# Build images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs (limited output)
docker compose logs -f --tail=100

# Stop gracefully
docker compose down --timeout 30
```

### Production Checklist

- [ ] Use external managed database (RDS, Cloud SQL)
- [ ] Use external managed Redis (ElastiCache)
- [ ] Configure proper secrets management
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx, Traefik)
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Loki)
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Enable rate limiting

### Production Environment

```env
NODE_ENV=production

# Use external managed database
DATABASE_URL=postgresql://girok_user:secure-password@prod-db.example.com:5432/girok_user

JWT_SECRET=super-secure-jwt-secret-min-64-characters
JWT_REFRESH_SECRET=super-secure-refresh-secret-min-64-characters

FRONTEND_URL=https://example.com
VITE_API_URL=https://auth-api.example.com

# OAuth with production credentials
GOOGLE_CLIENT_ID=prod-google-client-id
GOOGLE_CLIENT_SECRET=prod-google-client-secret
GOOGLE_CALLBACK_URL=https://auth-api.example.com/api/v1/auth/google/callback
```

## Docker Compose Files

### Base Configuration (`docker-compose.yml`)

Defines all services with default settings:

- PostgreSQL 16
- Redis 7
- Auth Service
- Web Test App

### Development Overrides (`docker-compose.dev.yml`)

- Source code volumes for hot reload
- Development build targets
- Exposed ports for debugging
- Single replica per service

### Staging Overrides (`docker-compose.staging.yml`)

- Production build
- 2 replicas per service
- Resource limits
- External database support

### Production Overrides (`docker-compose.prod.yml`)

- Production build
- 3 replicas for auth service
- Strict resource limits
- Health checks
- Auto-restart policies
- Log rotation

## Service Architecture

```
┌─────────────────────────────────────────┐
│          Docker Network                 │
│                                          │
│  ┌──────────┐      ┌──────────────┐    │
│  │ Web Test │─────▶│ Auth Service │    │
│  │  (3000)  │      │    (3001)    │    │
│  └──────────┘      └──────┬───────┘    │
│                            │             │
│                    ┌───────▼────────┐   │
│                    │   PostgreSQL   │   │
│                    │     (5432)     │   │
│                    └────────────────┘   │
│                            │             │
│                    ┌───────▼────────┐   │
│                    │     Redis      │   │
│                    │     (6379)     │   │
│                    └────────────────┘   │
└─────────────────────────────────────────┘
```

## Health Checks

All services include health checks:

### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U dev_girok_user"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Auth Service

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health')"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Check Service Health

```bash
# View health status
docker compose ps

# Check specific service
docker inspect --format='{{json .State.Health}}' my-girok-auth-service

# View health check logs
docker inspect my-girok-auth-service | jq '.[0].State.Health'
```

## Useful Commands

### Container Management

```bash
# List running containers
docker compose ps

# View container logs
docker compose logs -f [service-name]

# Execute command in container
docker compose exec auth-service sh

# Restart service
docker compose restart auth-service

# Rebuild service
docker compose up -d --build auth-service

# Scale service
docker compose up -d --scale auth-service=3
```

### Database Operations

```bash
# Access PostgreSQL
docker compose exec postgres psql -U dev_girok_user -d dev_girok_user

# Run migrations
docker compose exec auth-service pnpm prisma migrate deploy

# Database backup
docker compose exec postgres pg_dump -U dev_girok_user dev_girok_user > backup.sql

# Database restore
docker compose exec -T postgres psql -U dev_girok_user dev_girok_user < backup.sql
```

### Redis Operations

```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Monitor Redis
docker compose exec redis redis-cli MONITOR

# View stats
docker compose exec redis redis-cli INFO
```

### Cleanup

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes
docker compose down -v

# Stop and remove everything including images
docker compose down -v --rmi all

# Remove unused Docker resources
docker system prune -a
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs auth-service

# Check health status
docker compose ps

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Database Connection Issues

```bash
# Verify database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Test connection
docker compose exec postgres pg_isready -U dev_girok_user

# Verify environment variables
docker compose exec auth-service env | grep DATABASE_URL
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3002:3001"  # Host:Container
```

### Out of Memory

```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory

# Clean up unused resources
docker system prune -a
```

### Slow Build Times

```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with cache
docker compose build

# Build without cache (if issues)
docker compose build --no-cache
```

## Performance Optimization

### Enable BuildKit

```bash
# In ~/.bashrc or ~/.zshrc
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### Use Multi-stage Builds

Already implemented in Dockerfiles:
- Builder stage: Install dependencies and build
- Production stage: Copy only necessary files

### Volume Mounts for Development

Development compose file mounts source code for hot reload:

```yaml
volumes:
  - ./services/auth-service/src:/app/services/auth-service/src:ro
```

## Security Best Practices

- ✅ Non-root user in containers (UID 1000)
- ✅ Read-only root filesystem
- ✅ Dropped capabilities
- ✅ No privilege escalation
- ✅ Secrets via environment variables (never hardcoded)
- ✅ Network isolation
- ✅ Health checks
- ✅ Resource limits

## Monitoring

### View Resource Usage

```bash
# Real-time stats
docker stats

# Export metrics (Prometheus format)
# Configure Prometheus to scrape Docker metrics
```

### Log Management

```bash
# View logs with timestamps
docker compose logs -f -t

# Limit log output
docker compose logs --tail=100

# Export logs
docker compose logs > logs.txt
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build images
        run: docker compose build

      - name: Push to registry
        run: docker compose push
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/my-girok/issues
- Documentation: https://github.com/your-org/my-girok/tree/main/docs
