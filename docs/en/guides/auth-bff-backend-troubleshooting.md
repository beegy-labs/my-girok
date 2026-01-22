# Auth BFF Backend Troubleshooting Guide

This guide provides verification steps, testing procedures, and troubleshooting solutions for auth-bff backend dependencies.

## Overview

The auth-bff service depends on several backend systems including ClickHouse for analytics, PostgreSQL for authorization data, gRPC services, and GeoIP databases. This guide helps you verify these connections and resolve common issues.

## Verification Steps

### Checking ClickHouse Connection

To verify that ClickHouse is running and accessible, use the ping endpoint:

```bash
curl http://localhost:8123/ping
# Expected: Ok.
```

If the ping succeeds, ClickHouse is running and accepting connections.

### Checking Authorization Database

Verify the PostgreSQL authorization database is accessible and contains the expected tables:

```bash
psql postgresql://postgres:postgres@localhost:5432/authorization_service -c "\dt"
# Expected: List of tables including authorization_models, teams
```

This command lists all tables in the authorization_service database.

### Checking Authorization gRPC Service

Verify the authorization gRPC service is running and responding:

```bash
grpcurl -plaintext localhost:50055 list
# Expected: authorization.v1.AuthorizationService
```

This command lists all available gRPC services on the specified port.

### Checking GeoIP Database

Verify the GeoIP database file exists and has the expected size:

```bash
ls -lh /data/geoip/GeoLite2-Country.mmdb
# Expected: File exists with size ~6MB
```

The GeoIP database is used for country-level IP geolocation.

## Running Tests

### Full Test Suite

Run the complete test suite for the auth-bff service:

```bash
cd services/auth-bff
pnpm test
```

### Specific Service Tests

You can run tests for individual services to isolate issues:

```bash
# Analytics service tests
pnpm test analytics.service.spec.ts

# Authorization service tests
pnpm test authorization.service.spec.ts

# Teams service tests
pnpm test teams.service.spec.ts
```

## Troubleshooting Common Issues

### ClickHouse Connection Issues

**Error Message**: `ClickHouse client not connected`

**Possible Causes and Solutions**:

1. **ClickHouse server not running**: Start the ClickHouse server using your deployment method (Docker, systemd, etc.)

2. **Incorrect connection settings**: Verify that `CLICKHOUSE_HOST` and `CLICKHOUSE_PORT` environment variables are set correctly

3. **Missing database**: Ensure the `analytics_db` database exists in ClickHouse. You can create it with:
   ```sql
   CREATE DATABASE IF NOT EXISTS analytics_db;
   ```

### Authorization Database Issues

**Error Message**: `Failed to connect to authorization database`

**Possible Causes and Solutions**:

1. **PostgreSQL server not running**: Start the PostgreSQL server

2. **Incorrect connection URL**: Verify that `AUTHORIZATION_DATABASE_URL` is correctly formatted and points to the right host

3. **Missing database**: Ensure the `authorization_service` database exists

4. **Migrations not applied**: Run Prisma migrations in the authorization-service to create the required tables

### Authorization gRPC Issues

**Error Message**: `Authorization service not connected`

**Possible Causes and Solutions**:

1. **Service not running**: Start the authorization-service application

2. **Incorrect host/port configuration**: Verify `AUTHORIZATION_GRPC_HOST` and `AUTHORIZATION_GRPC_PORT` environment variables

3. **Service health check**: Use grpcurl to verify the service is responding:
   ```bash
   grpcurl -plaintext localhost:50055 list
   ```

### GeoIP Issues

**Warning Message**: `GeoIP database not found`

**Possible Causes and Solutions**:

1. **Database file missing**: Download the GeoLite2-Country.mmdb file from MaxMind (requires free account)

2. **Incorrect file location**: Place the file at `/data/geoip/GeoLite2-Country.mmdb` or set the `GEOIP_DATABASE_PATH` environment variable to the correct path

3. **Optional dependency**: Note that GeoIP is optional and the service will function without it. Country detection will simply be unavailable.

## Production Considerations

When deploying to production, consider the following recommendations:

1. **ClickHouse**: Use a dedicated ClickHouse cluster with replication for high availability and better query performance

2. **Authorization Database**: Use managed PostgreSQL with read replicas to handle increased read traffic and provide failover capability

3. **gRPC Communication**: Implement a service mesh (such as Istio or Linkerd) to provide mTLS encryption, load balancing, and observability for gRPC calls

4. **GeoIP Database**: Set up automated weekly updates for the GeoLite2 database, as MaxMind releases updates on Tuesdays

5. **Monitoring**: Implement comprehensive metrics and alerts for all external dependencies to detect issues before they impact users

---

_This document is auto-generated from `docs/llm/guides/auth-bff-backend-troubleshooting.md`_
