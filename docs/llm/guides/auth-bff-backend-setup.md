# Backend Setup Guide

This guide covers setting up the backend dependencies for the auth-bff service after implementing the analytics, authorization, and teams functionality.

## Prerequisites

- ClickHouse server (for analytics)
- PostgreSQL database (for authorization models and teams)
- MaxMind GeoLite2 database (optional, for IP geolocation)

## Required Services

### 1. ClickHouse

The analytics service queries ClickHouse for session recording metadata.

**Database**: `analytics_db`

**Tables Used**:

- `session_recording_metadata` - Session-level aggregates and metadata

**Setup**:

```bash
# Run ClickHouse migrations
clickhouse-client --queries-file infrastructure/clickhouse/migrations/004_create_session_recordings.sql
```

**Environment Variables**:

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
```

### 2. Authorization Service Database

The teams and authorization services use a PostgreSQL database.

**Database**: `authorization_service`

**Tables Used**:

- `authorization_models` - Authorization DSL models and versions
- `teams` - Team metadata
- `authorization_tuples` - Permission tuples (accessed via gRPC)

**Setup**:

```bash
# Connection string
export AUTHORIZATION_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/authorization_service"

# Run migrations via authorization-service
cd services/authorization-service
pnpm prisma migrate deploy
```

**Environment Variables**:

```env
AUTHORIZATION_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authorization_service
```

### 3. Authorization gRPC Service

The authorization and teams services communicate with the authorization-service via gRPC.

**Port**: 50055 (default)

**Required Methods**:

- `Check` / `BatchCheck` - Permission checking
- `Write` - Grant/revoke permissions
- `ListObjects` / `ListUsers` - Query permissions

**Setup**:

```bash
# Start authorization-service
cd services/authorization-service
pnpm start:dev
```

**Environment Variables**:

```env
AUTHORIZATION_GRPC_HOST=localhost
AUTHORIZATION_GRPC_PORT=50055
```

### 4. GeoIP Service (Optional)

The GeoIP service provides IP-to-country code conversion using MaxMind GeoLite2.

**Database File**: `/data/geoip/GeoLite2-Country.mmdb`

**Setup**:

1. Sign up for a free MaxMind account at https://www.maxmind.com/en/geolite2/signup
2. Download the GeoLite2 Country database (MMDB format)
3. Place the file at `/data/geoip/GeoLite2-Country.mmdb`

**Alternative Path**:

```env
GEOIP_DATABASE_PATH=/custom/path/GeoLite2-Country.mmdb
```

**Without GeoIP**:
The service will log a warning and disable GeoIP lookups if the database file is not found. All other functionality will work normally.

## Complete Environment Variables

Add to `services/auth-bff/.env`:

```env
# ClickHouse (Analytics)
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=

# Authorization Database
AUTHORIZATION_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authorization_service

# Authorization gRPC Service
AUTHORIZATION_GRPC_HOST=localhost
AUTHORIZATION_GRPC_PORT=50055

# GeoIP (Optional)
GEOIP_DATABASE_PATH=/data/geoip/GeoLite2-Country.mmdb
```

## Related Documentation

- **Troubleshooting & Testing**: `auth-bff-backend-troubleshooting.md`
- [Session Replay SSOT](../features/session-replay.md)
- [ClickHouse Schema](../../../infrastructure/clickhouse/migrations/004_create_session_recordings.sql)
- [Authorization Service](../../authorization-service/README.md)
