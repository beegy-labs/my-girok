# Docker 배포

> 로컬 개발을 위한 Docker Compose

## 사전 요구 사항

- Docker 24.0+
- Docker Compose 2.20+
- 2GB+ RAM, 10GB+ 디스크

## 빠른 시작

```bash
# 복제 및 구성
cp .env.example .env

# 개발 (핫 리로드)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 로그 보기
docker compose logs -f

# 중지
docker compose down
```

## 액세스 포인트

| 서비스     | URL                            |
| ---------- | ------------------------------ |
| 웹 앱      | http://localhost:3000          |
| 인증 API   | http://localhost:3001          |
| API 문서   | http://localhost:3001/api/docs |
| PostgreSQL | localhost:5432                 |
| Redis      | localhost:6379                 |

## 환경 변수

```env
# 데이터베이스
DB_USER=dev_girok_user
DB_PASSWORD=your-password
DB_NAME=dev_girok_user
DATABASE_URL=postgresql://dev_girok_user:password@localhost:5432/dev_girok_user

# 애플리케이션
NODE_ENV=development
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret

# 프론트엔드
VITE_API_URL=http://localhost:3001
```

## Compose 파일

| 파일                       | 목적                      |
| -------------------------- | ------------------------- |
| docker-compose.yml         | 기본 구성                 |
| docker-compose.dev.yml     | 핫 리로드, 포트 노출      |
| docker-compose.staging.yml | 2개의 복제본, 리소스 제한 |
| docker-compose.prod.yml    | 3개의 복제본, 엄격한 제한 |

## 명령어

```bash
# 서비스 재시작
docker compose restart auth-service

# 다시 빌드
docker compose up -d --build auth-service

# 스케일 조정
docker compose up -d --scale auth-service=3

# DB 접속
docker compose exec postgres psql -U dev_girok_user -d dev_girok_user

# 백업
docker compose exec postgres pg_dump -U dev_girok_user dev_girok_user > backup.sql

# 정리
docker compose down -v --rmi all
```

## 상태 확인

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U dev_girok_user"]

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]

# 인증 서비스
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health')"]
```

## 문제 해결

| 문제              | 해결 방법                                 |
| ----------------- | ----------------------------------------- |
| 서비스 시작 안 됨 | `docker compose logs <service>`           |
| DB 연결 실패      | `docker compose exec postgres pg_isready` |
| 포트 사용 중      | `lsof -i :3001` 후 `kill -9 <PID>`        |
| 메모리 부족       | `docker stats`, Docker 메모리 증가        |

## 프로덕션 체크리스트

- [ ] 외부 관리형 DB 사용 (RDS)
- [ ] 외부 Redis 사용 (ElastiCache)
- [ ] SSL/TLS 구성
- [ ] 리버스 프록시 설정
- [ ] 모니터링 설정
- [ ] 로그 집계 구성
- [ ] 백업 설정

---

**Kubernetes 배포**: `docs/policies/DEPLOYMENT.md` 참조
