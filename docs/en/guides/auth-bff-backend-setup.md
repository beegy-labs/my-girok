# Backend Setup Guide for Auth-BFF Service

> Setting up backend dependencies for analytics, authorization, and teams functionality

## Overview

This guide walks you through configuring the backend infrastructure required for the auth-bff service. After implementing analytics, authorization, and teams functionality, you will need to set up several external dependencies including ClickHouse for analytics queries, PostgreSQL for authorization models, and optionally MaxMind GeoIP for IP geolocation.

## Prerequisites

Before you begin, ensure you have the following services available:

- **ClickHouse server** for analytics data storage and queries
- **PostgreSQL database** for authorization models and team management
- **MaxMind GeoLite2 database** (optional) for IP-to-country code conversion

## Service Configuration

### ClickHouse Setup

The analytics service queries ClickHouse for session recording metadata. You will need to configure access to the `analytics_db` database, which contains the `session_recording_metadata` table for session-level aggregates.

Run the ClickHouse migrations to create the required tables:

```bash
# Run ClickHouse migrations
clickhouse-client --queries-file infrastructure/clickhouse/migrations/004_create_session_recordings.sql
```

Configure the following environment variables for ClickHouse connectivity:

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
```

### Authorization Service Database

The teams and authorization services store their data in PostgreSQL. This database contains authorization DSL models and versions, team metadata, and permission tuples (accessed via gRPC).

Set up the connection and run migrations:

```bash
# Connection string
export AUTHORIZATION_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/authorization_service"

# Run migrations via authorization-service
cd services/authorization-service
pnpm prisma migrate deploy
```

Add this environment variable to your configuration:

```env
AUTHORIZATION_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authorization_service
```

### Authorization gRPC Service

The authorization and teams functionality communicates with the authorization-service via gRPC on port 50055. The service provides permission checking via `Check` and `BatchCheck` methods, permission granting and revoking via `Write`, and permission querying via `ListObjects` and `ListUsers`.

Start the authorization service:

```bash
# Start authorization-service
cd services/authorization-service
pnpm start:dev
```

Configure the gRPC connection:

```env
AUTHORIZATION_GRPC_HOST=localhost
AUTHORIZATION_GRPC_PORT=50055
```

### GeoIP Service (Optional)

The GeoIP service provides IP-to-country code conversion using the MaxMind GeoLite2 database. This feature is optional and the service will function normally without it.

To enable GeoIP lookups:

1. Sign up for a free MaxMind account at https://www.maxmind.com/en/geolite2/signup
2. Download the GeoLite2 Country database in MMDB format
3. Place the file at `/data/geoip/GeoLite2-Country.mmdb`

To use a custom path, set:

```env
GEOIP_DATABASE_PATH=/custom/path/GeoLite2-Country.mmdb
```

If the database file is not found, the service will log a warning and disable GeoIP lookups. All other functionality continues to work normally.

## Complete Environment Configuration

Add all required variables to `services/auth-bff/.env`:

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

## Verification Steps

After configuration, verify each service is accessible.

### Verify ClickHouse Connection

```bash
curl http://localhost:8123/ping
# Expected: Ok.
```

### Verify Authorization Database

```bash
psql postgresql://postgres:postgres@localhost:5432/authorization_service -c "\dt"
# Expected: List of tables including authorization_models, teams
```

### Verify Authorization gRPC Service

```bash
grpcurl -plaintext localhost:50055 list
# Expected: authorization.v1.AuthorizationService
```

### Verify GeoIP Database

```bash
ls -lh /data/geoip/GeoLite2-Country.mmdb
# Expected: File exists with size ~6MB
```

## Running Tests

Execute the service test suite to ensure everything is configured correctly:

```bash
cd services/auth-bff
pnpm test
```

Run tests for specific services:

```bash
# Analytics service
pnpm test analytics.service.spec.ts

# Authorization service
pnpm test authorization.service.spec.ts

# Teams service
pnpm test teams.service.spec.ts
```

## Troubleshooting

### ClickHouse Connection Issues

If you see `ClickHouse client not connected`, verify that the ClickHouse server is running, check that `CLICKHOUSE_HOST` and `CLICKHOUSE_PORT` are correct, and ensure the `analytics_db` database exists.

### Authorization Database Issues

If you encounter `Failed to connect to authorization database`, confirm that the PostgreSQL server is running, verify the `AUTHORIZATION_DATABASE_URL` is correctly formatted, ensure the `authorization_service` database exists, and run Prisma migrations in the authorization-service directory.

### Authorization gRPC Issues

When seeing `Authorization service not connected`, check that authorization-service is running, verify the `AUTHORIZATION_GRPC_HOST` and `AUTHORIZATION_GRPC_PORT` settings, and test the gRPC service health with `grpcurl -plaintext localhost:50055 list`.

### GeoIP Issues

If you see `GeoIP database not found`, download GeoLite2-Country.mmdb from MaxMind, place it at `/data/geoip/GeoLite2-Country.mmdb` or configure `GEOIP_DATABASE_PATH`. Remember that GeoIP is optional and the service works without it.

## Production Considerations

When deploying to production, keep these recommendations in mind:

- **ClickHouse**: Use a dedicated ClickHouse cluster for high availability and performance
- **Authorization DB**: Use managed PostgreSQL with read replicas for scalability
- **gRPC**: Use a service mesh like Istio or Linkerd for mTLS and load balancing
- **GeoIP**: Update the GeoLite2 database weekly as MaxMind releases updates
- **Monitoring**: Set up metrics and alerts for all external dependencies

## Related Documentation

- [Session Replay Feature Documentation](../../../docs/llm/features/session-replay.md)
- [ClickHouse Schema](../../../infrastructure/clickhouse/migrations/004_create_session_recordings.sql)
- [Authorization Service](../../authorization-service/README.md)

---

**LLM Reference**: `docs/llm/guides/auth-bff-backend-setup.md`
