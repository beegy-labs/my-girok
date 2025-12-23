# Database Quick Reference

## Stack

| Component | Tool          | Purpose                              |
| --------- | ------------- | ------------------------------------ |
| Migration | goose (MIT)   | Schema versioning, SQL SSOT          |
| ORM       | Prisma 6      | Client generation, type-safe queries |
| Database  | PostgreSQL 16 | Primary data store                   |

## Environment Structure

```
Development:  girok_auth_dev / girok_personal_dev  (develop branch)
Staging:      girok_auth_stg / girok_personal_stg  (release/* branch)
Production:   girok_auth / girok_personal          (main branch)
```

## Migration Strategy (goose + ArgoCD)

### SSOT Principle

```
my-girok/services/<service>/migrations/  <- Single Source of Truth
                    |
              Docker Image (baked in)
                    |
         ArgoCD PreSync Hook Job (goose up)
                    |
              App Deployment
```

### File Structure

```
services/
├── auth-service/
│   ├── migrations/
│   │   ├── 20251220000000_baseline.sql
│   │   ├── 20251221000000_add_legal_consent.sql
│   │   └── ...
│   └── prisma/
│       └── schema.prisma  <- For client generation only
└── personal-service/
    ├── migrations/
    │   ├── 20251211000000_baseline.sql
    │   ├── 20251212000000_add_copy_status.sql
    │   └── ...
    └── prisma/
        └── schema.prisma
```

## Local Development

### Create Migration

```bash
cd services/auth-service

# Create new migration file
goose -dir migrations create add_user_preferences sql

# Edit the generated file
vim migrations/20250123120000_add_user_preferences.sql
```

### SQL File Format

```sql
-- +goose Up
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- +goose Down
DROP TABLE IF EXISTS user_preferences;
```

### PL/pgSQL Functions

Use `StatementBegin/End` for functions with `$$`:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS update_updated_at;
```

### Apply Locally

```bash
# Get DATABASE_URL from Vault
export VAULT_ADDR=https://vault.girok.dev
vault kv get -field=url secret/apps/my-girok/auth-service/postgres

# Apply all pending migrations
goose -dir migrations postgres "$DATABASE_URL" up

# Check status
goose -dir migrations postgres "$DATABASE_URL" status

# Rollback last
goose -dir migrations postgres "$DATABASE_URL" down
```

### Update Prisma Schema

After goose migration, sync Prisma schema:

```bash
# Pull schema from DB
pnpm prisma db pull

# Generate client
pnpm prisma generate
```

## Deployment (GitOps)

### Workflow

1. Create migration SQL in `services/<service>/migrations/`
2. Update `prisma/schema.prisma` to match
3. Commit and push to develop
4. CI builds Docker image with migrations baked in
5. Update image tag in `platform-gitops`
6. **Manual Sync** in ArgoCD
7. PreSync Job runs `goose up`
8. App pods deploy

### ArgoCD PreSync Hook

Located at `helm/templates/migration-job.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-5"
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["goose", "-dir", "/app/services/<service>/migrations", "postgres", "$(DATABASE_URL)", "up"]
```

Enable in platform-gitops values:

```yaml
migration:
  enabled: true
```

## Common Commands

```bash
# goose commands
goose -dir migrations create <name> sql    # Create migration
goose -dir migrations postgres $DB up      # Apply all
goose -dir migrations postgres $DB down    # Rollback 1
goose -dir migrations postgres $DB status  # Show status
goose -dir migrations postgres $DB version # Current version

# Prisma commands (client generation only)
pnpm prisma generate     # Generate client
pnpm prisma db pull      # Introspect DB -> schema.prisma
pnpm prisma studio       # GUI browser
```

## Best Practices

### DO

- Write reversible migrations (always include `-- +goose Down`)
- Use `TEXT` for ID columns (matches Prisma default)
- Use `TIMESTAMPTZ(6)` for timestamps
- Test migrations locally before commit
- Keep schema.prisma in sync with migrations
- Use Manual Sync for production deployments

### DON'T

- Use `prisma migrate` (goose is SSOT)
- Skip down migration
- Modify existing migration files
- Auto-sync in ArgoCD for DB changes
- Use UUID type directly (use TEXT with gen_random_uuid()::TEXT)

## Database Connections

| Service          | Dev Database       | Host                      |
| ---------------- | ------------------ | ------------------------- |
| auth-service     | girok_auth_dev     | db-postgres-001.beegy.net |
| personal-service | girok_personal_dev | db-postgres-001.beegy.net |

**Vault paths**:

- `secret/apps/my-girok/auth-service/postgres`
- `secret/apps/my-girok/personal-service/postgres`

## Troubleshooting

### Check Migration Status

```bash
# Local
goose -dir migrations postgres "$DATABASE_URL" status

# Kubernetes
kubectl logs job/<service>-migrate -n dev-my-girok
```

### Migration Failed

1. Check Job logs in ArgoCD
2. Fix SQL syntax
3. Rebuild image
4. Sync again

### Prisma Schema Drift

```bash
# Reset Prisma schema from DB
pnpm prisma db pull

# Regenerate client
pnpm prisma generate
```

## See Also

- **Full Guide**: `docs/DATABASE.md`
- **goose docs**: https://github.com/pressly/goose
- **Prisma docs**: https://www.prisma.io/docs
