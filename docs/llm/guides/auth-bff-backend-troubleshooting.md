# Backend Setup Troubleshooting

> Verification, testing, and troubleshooting for auth-bff backend dependencies

## Verification

### Check ClickHouse Connection

```bash
curl http://localhost:8123/ping
# Expected: Ok.
```

### Check Authorization Database

```bash
psql postgresql://postgres:postgres@localhost:5432/authorization_service -c "\dt"
# Expected: List of tables including authorization_models, teams
```

### Check Authorization gRPC Service

```bash
grpcurl -plaintext localhost:50055 list
# Expected: authorization.v1.AuthorizationService
```

### Check GeoIP Database

```bash
ls -lh /data/geoip/GeoLite2-Country.mmdb
# Expected: File exists with size ~6MB
```

## Testing

Run the service tests:

```bash
cd services/auth-bff
pnpm test
```

Run specific service tests:

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

**Error**: `ClickHouse client not connected`

**Solution**:

- Check that ClickHouse server is running
- Verify `CLICKHOUSE_HOST` and `CLICKHOUSE_PORT` are correct
- Ensure the `analytics_db` database exists

### Authorization Database Issues

**Error**: `Failed to connect to authorization database`

**Solution**:

- Check that PostgreSQL server is running
- Verify `AUTHORIZATION_DATABASE_URL` is correct
- Ensure the `authorization_service` database exists
- Run Prisma migrations in authorization-service

### Authorization gRPC Issues

**Error**: `Authorization service not connected`

**Solution**:

- Check that authorization-service is running
- Verify `AUTHORIZATION_GRPC_HOST` and `AUTHORIZATION_GRPC_PORT` are correct
- Check gRPC service health: `grpcurl -plaintext localhost:50055 list`

### GeoIP Issues

**Warning**: `GeoIP database not found`

**Solution**:

- Download GeoLite2-Country.mmdb from MaxMind
- Place file at `/data/geoip/GeoLite2-Country.mmdb`
- Or set `GEOIP_DATABASE_PATH` to the correct path
- GeoIP is optional - service will work without it

## Production Considerations

1. **ClickHouse**: Use a dedicated ClickHouse cluster in production
2. **Authorization DB**: Use managed PostgreSQL with read replicas
3. **gRPC**: Use service mesh (Istio/Linkerd) for mTLS and load balancing
4. **GeoIP**: Update GeoLite2 database weekly (MaxMind releases updates)
5. **Monitoring**: Set up metrics and alerts for all external dependencies

---

_Main: `auth-bff-backend-setup.md`_
