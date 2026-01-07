# Docker 배포

> 로컬 개발용 Docker Compose 설정

## 사전 요구 사항

- Docker 24.0+
- Docker Compose 2.20+
- 2GB+ RAM 사용 가능
- 10GB+ 디스크 공간

## 빠른 시작

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

## 접근 포인트

| 서비스       | URL                            |
| ------------ | ------------------------------ |
| Web App      | http://localhost:3000          |
| Auth API     | http://localhost:3001          |
| API Docs     | http://localhost:3001/api/docs |
| PostgreSQL   | localhost:5432                 |
| Redis/Valkey | localhost:6379                 |

## 환경 설정

```env
DB_USER=dev_girok_user
DB_PASSWORD=your-password
DATABASE_URL=postgresql://dev_girok_user:your-password@localhost:5432/dev_girok
JWT_SECRET=your-jwt-secret-min-32-chars
VITE_API_URL=http://localhost:3001
```

## Compose 파일 프로파일

| 파일                       | 용도                       |
| -------------------------- | -------------------------- |
| docker-compose.yml         | Base configuration         |
| docker-compose.dev.yml     | Hot reload for development |
| docker-compose.staging.yml | 2 replicas for staging     |
| docker-compose.prod.yml    | 3 replicas for production  |

## 일반 명령어

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

## 헬스 체크

```yaml
PostgreSQL: pg_isready -U dev_girok_user
Redis: redis-cli ping
Auth Service: curl localhost:3001/api/v1/health
```

## 문제 해결

| 문제                 | 해결책                                                        |
| -------------------- | ------------------------------------------------------------- |
| Service won't start  | Check logs: `docker compose logs <service>`                   |
| DB connection failed | Verify DB is ready: `docker compose exec postgres pg_isready` |
| Port already in use  | Find process: `lsof -i :3001`, then kill: `kill -9 <PID>`     |
| Out of memory        | Check usage: `docker stats`, increase Docker memory           |

## 프로덕션 체크리스트

프로덕션에 배포하기 전에:

- [ ] 외부 관리형 데이터베이스 사용 (RDS, Cloud SQL)
- [ ] 외부 Redis/Valkey 사용 (ElastiCache, MemoryStore)
- [ ] SSL/TLS 인증서 구성
- [ ] 리버스 프록시 설정 (nginx, Traefik)
- [ ] 모니터링 및 알림 활성화
- [ ] 중앙집중형 로그 집계 구성
- [ ] 자동 백업 설정
- [ ] 비밀 키 검토 및 회전

---

**LLM 참조**: `docs/llm/DOCKER_DEPLOYMENT.md`
