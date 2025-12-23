# Database Management Guide

Complete guide for database setup, migrations, and management across environments.

## Table of Contents

- [Overview](#overview)
- [Database Structure](#database-structure)
- [Migration Strategy (goose + ArgoCD)](#migration-strategy-goose--argocd)
- [Local Development](#local-development)
- [Deployment Workflow](#deployment-workflow)
- [Prisma Integration](#prisma-integration)
- [Timezone Handling](#timezone-handling)
- [Backup & Restore](#backup--restore)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

### Technology Stack

| Component | Tool          | Purpose                                     |
| --------- | ------------- | ------------------------------------------- |
| Migration | goose (MIT)   | SQL-based schema versioning (SSOT)          |
| ORM       | Prisma 6      | Type-safe client generation                 |
| Database  | PostgreSQL 16 | Primary data store                          |
| GitOps    | ArgoCD        | Deployment orchestration with PreSync hooks |

### Why goose + Prisma?

- **goose**: Language-agnostic SQL migrations, works with Node.js, Python, Rust, Java
- **Prisma**: Type-safe ORM client for TypeScript/JavaScript services
- **Separation of concerns**: goose handles schema changes, Prisma handles queries
- **MIT License**: goose is fully open source, no vendor lock-in

### Migration Ownership

```
goose migrations/       -> SSOT for schema changes
prisma/schema.prisma    -> Client generation only (synced from DB)
```

## Database Structure

### Three-Tier Environment

| Environment | Auth Database  | Personal Database  | Branch     |
| ----------- | -------------- | ------------------ | ---------- |
| Development | girok_auth_dev | girok_personal_dev | develop    |
| Staging     | girok_auth_stg | girok_personal_stg | release/\* |
| Production  | girok_auth     | girok_personal     | main       |

### Services and Databases

| Service          | Dev Database       | Prod Database  | Namespace    |
| ---------------- | ------------------ | -------------- | ------------ |
| auth-service     | girok_auth_dev     | girok_auth     | dev-my-girok |
| personal-service | girok_personal_dev | girok_personal | dev-my-girok |

### Connection Management

**Vault Paths:**

- `secret/apps/my-girok/auth-service/postgres`
- `secret/apps/my-girok/personal-service/postgres`

**K8s Secrets (via ESO):**

- `my-girok-dev-auth-service-secret`
- `my-girok-dev-personal-service-secret`

## Migration Strategy (goose + ArgoCD)

### SSOT Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Single Source of Truth                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  services/auth-service/migrations/                               │
│  ├── 20251220000000_baseline.sql                                │
│  ├── 20251221000000_add_legal_consent.sql                       │
│  └── ...                                                        │
│                           │                                      │
│                           ▼                                      │
│               Docker Image (migrations baked in)                 │
│               - goose binary installed                           │
│               - migrations/ folder copied                        │
│                           │                                      │
│                           ▼                                      │
│          ArgoCD PreSync Hook Job (goose up)                     │
│          - Runs before app deployment                           │
│          - Manual Sync required                                 │
│                           │                                      │
│                           ▼                                      │
│                   Database Updated                               │
│                           │                                      │
│                           ▼                                      │
│                    App Pods Deploy                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
services/
├── auth-service/
│   ├── Dockerfile              # Includes goose binary + migrations
│   ├── migrations/             # goose SQL migrations (SSOT)
│   │   ├── 20251220000000_baseline.sql
│   │   ├── 20251221000000_add_legal_consent.sql
│   │   └── ...
│   ├── helm/
│   │   └── templates/
│   │       └── migration-job.yaml  # ArgoCD PreSync Job
│   └── prisma/
│       └── schema.prisma       # For client generation only
│
└── personal-service/
    ├── Dockerfile
    ├── migrations/
    │   ├── 20251211000000_baseline.sql
    │   ├── 20251212000000_add_copy_status.sql
    │   └── ...
    ├── helm/
    │   └── templates/
    │       └── migration-job.yaml
    └── prisma/
        └── schema.prisma
```

### Dockerfile Configuration

goose binary is installed in the production image:

```dockerfile
# Production stage
FROM node:22-alpine AS production

# Install security updates and goose for migrations
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    wget -qO- https://github.com/pressly/goose/releases/download/v3.24.1/goose_linux_x86_64 -O /usr/local/bin/goose && \
    chmod +x /usr/local/bin/goose

# ... other setup ...

# Copy goose migrations
COPY --chown=node:node --from=builder /app/services/<service>/migrations ./services/<service>/migrations
```

### ArgoCD PreSync Job

Located at `helm/templates/migration-job.yaml`:

```yaml
{{- if .Values.migration.enabled }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "<service>.fullname" . }}-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-5"
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command:
            - /bin/sh
            - -c
            - |
              goose -dir /app/services/<service>/migrations postgres "$DATABASE_URL" up
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "<service>.fullname" . }}-secret
                  key: database-url
{{- end }}
```

### goose_db_version Table

goose automatically creates and manages this table:

```sql
SELECT * FROM goose_db_version;

 id | version_id     | is_applied |        tstamp
----+----------------+------------+------------------------
  1 | 0              | t          | 2025-12-20 00:00:00+00
  2 | 20251220000000 | t          | 2025-12-20 01:20:00+00
  3 | 20251221000000 | t          | 2025-12-21 01:24:19+00
```

## Local Development

### Prerequisites

```bash
# Install goose (Ubuntu/Debian)
go install github.com/pressly/goose/v3/cmd/goose@latest
export PATH=$PATH:$(go env GOPATH)/bin

# Or via Homebrew (macOS)
brew install goose

# Verify installation
goose --version
```

### Create New Migration

```bash
cd services/auth-service

# Create migration file
goose -dir migrations create add_user_preferences sql

# This creates: migrations/20250123120000_add_user_preferences.sql
```

### Write Migration SQL

```sql
-- +goose Up
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    locale VARCHAR(10) DEFAULT 'ko',
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- +goose Down
DROP TABLE IF EXISTS user_preferences;
```

### PL/pgSQL Functions

For functions with `$$` syntax, use StatementBegin/End:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP FUNCTION IF EXISTS update_updated_at_column;
```

### Apply Migration Locally

```bash
# Get DATABASE_URL from Vault
export VAULT_ADDR=https://vault.girok.dev
export VAULT_TOKEN="your-token"
export DATABASE_URL=$(vault kv get -field=url secret/apps/my-girok/auth-service/postgres)

# Apply all pending migrations
goose -dir migrations postgres "$DATABASE_URL" up

# Check status
goose -dir migrations postgres "$DATABASE_URL" status

# Rollback last migration
goose -dir migrations postgres "$DATABASE_URL" down

# Rollback to specific version
goose -dir migrations postgres "$DATABASE_URL" down-to 20251220000000
```

### Common goose Commands

| Command                   | Description                         |
| ------------------------- | ----------------------------------- |
| `goose create <name> sql` | Create new SQL migration            |
| `goose up`                | Apply all pending migrations        |
| `goose up-by-one`         | Apply next pending migration        |
| `goose down`              | Rollback last migration             |
| `goose down-to VERSION`   | Rollback to specific version        |
| `goose status`            | Show migration status               |
| `goose version`           | Show current version                |
| `goose redo`              | Rollback and reapply last migration |

## Deployment Workflow

### Step-by-Step Process

#### 1. Create Migration

```bash
cd services/auth-service
goose -dir migrations create add_feature sql
vim migrations/20250123120000_add_feature.sql
```

#### 2. Test Locally

```bash
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" status
```

#### 3. Update Prisma Schema

```bash
pnpm prisma db pull
pnpm prisma generate
```

#### 4. Commit and Push

```bash
git add migrations/ prisma/schema.prisma
git commit -m "feat(db): add feature table"
git push origin develop
```

#### 5. CI Builds Image

GitHub Actions:

- Builds Docker image with goose binary and migrations folder
- Pushes to registry: `gitea.girok.dev/beegy-labs/auth-service:develop-abc123`

#### 6. Update GitOps Repo

```bash
# In platform-gitops
vim clusters/home/values/my-girok-auth-service-dev.yaml
# Update image.tag and ensure migration.enabled: true

git add . && git commit -m "chore(auth): update image tag"
git push origin develop
```

#### 7. Manual Sync in ArgoCD

1. Open ArgoCD UI: https://argocd.girok.dev
2. Find application: `my-girok-auth-service-dev`
3. Click **Sync** button
4. Review PreSync Job (migration-job)
5. Click **Synchronize**

#### 8. Verify Migration

```bash
# Check Job logs
kubectl logs job/auth-service-migrate -n dev-my-girok

# Verify in database
psql "$DATABASE_URL" -c "SELECT * FROM goose_db_version ORDER BY version_id DESC LIMIT 5;"
```

## Prisma Integration

### Role of Prisma

| Task              | Tool                   |
| ----------------- | ---------------------- |
| Schema changes    | goose (SQL migrations) |
| Client generation | Prisma                 |
| Type-safe queries | Prisma Client          |
| DB introspection  | Prisma db pull         |

### Workflow

```
1. Create goose migration (SQL)
2. Apply migration: goose up
3. Sync Prisma: pnpm prisma db pull
4. Generate client: pnpm prisma generate
5. Commit both migrations/ and prisma/schema.prisma
```

### Prisma Commands (Client Only)

```bash
# Generate client from schema
pnpm prisma generate

# Pull schema from database
pnpm prisma db pull

# Open Prisma Studio (GUI)
pnpm prisma studio

# Validate schema
pnpm prisma validate
```

### DO NOT Use

```bash
# These commands are DISABLED - use goose instead
pnpm prisma migrate dev
pnpm prisma migrate deploy
pnpm prisma db push
```

## Timezone Handling

### Standard: UTC with TIMESTAMPTZ

All timestamps use TIMESTAMPTZ with UTC timezone.

#### SQL Convention

```sql
-- Correct: Use TIMESTAMPTZ
created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()

-- Incorrect: Missing timezone
created_at TIMESTAMP DEFAULT NOW()  -- DON'T
```

#### Prisma Schema Convention

```prisma
model User {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
}
```

#### API Response Format

Always return ISO 8601 with UTC:

```json
{
  "createdAt": "2025-01-23T14:30:00.000Z"
}
```

## Backup & Restore

### Automated Backup Schedule

| Environment | Frequency | Retention |
| ----------- | --------- | --------- |
| Development | Daily     | 7 days    |
| Staging     | Daily     | 14 days   |
| Production  | Hourly    | 30 days   |

### Manual Backup

```bash
# Create backup
pg_dump -h db-host -U girok_auth girok_auth > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -h db-host -U girok_auth girok_auth | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore from Backup

```bash
# Plain SQL
psql -h db-host -U girok_auth girok_auth < backup.sql

# Compressed
gunzip < backup.sql.gz | psql -h db-host -U girok_auth girok_auth
```

## Best Practices

### Migration Files

**DO:**

- Always include `-- +goose Down` section
- Use descriptive migration names
- Test migrations locally before commit
- Keep migrations small and focused
- Add indexes for queried columns
- Use `TEXT` for ID columns (matches Prisma)
- Use `TIMESTAMPTZ(6)` for timestamps
- Use `-- +goose StatementBegin/End` for PL/pgSQL functions

**DON'T:**

- Modify existing migration files
- Delete migration files
- Skip version numbers
- Use `prisma migrate` commands
- Use UUID type directly (use TEXT with gen_random_uuid()::TEXT)
- Auto-sync in ArgoCD for DB changes

### Zero-Downtime Migrations

For production, use safe patterns:

```sql
-- Adding nullable column (safe)
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);

-- Adding NOT NULL column (2-phase)
-- Phase 1: Add nullable
ALTER TABLE users ADD COLUMN status VARCHAR(20);
-- Phase 2: Populate + add constraint (separate migration)
UPDATE users SET status = 'active' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
```

### Code Review Checklist

- [ ] Migration file included
- [ ] Down migration works
- [ ] No data loss potential
- [ ] Indexes added for queried fields
- [ ] Prisma schema synced
- [ ] Tested locally
- [ ] Uses TEXT for IDs, TIMESTAMPTZ for dates

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
2. Identify SQL error
3. Fix migration file (if not yet applied) or create new migration
4. Rebuild Docker image
5. Update GitOps repo
6. Sync again

### Common Errors

#### Foreign Key Type Mismatch

```
ERROR: foreign key constraint ... cannot be implemented
DETAIL: Key columns ... are of incompatible types: uuid and text
```

**Solution**: Use `TEXT` instead of `UUID` for foreign keys:

```sql
-- Wrong
user_id UUID REFERENCES users(id)

-- Correct
user_id TEXT REFERENCES users(id)
```

#### PL/pgSQL Parsing Error

```
ERROR: unterminated dollar-quoted string
```

**Solution**: Add StatementBegin/End:

```sql
-- +goose StatementBegin
CREATE FUNCTION ... $$ ... $$ LANGUAGE plpgsql;
-- +goose StatementEnd
```

### Rollback Procedure

#### Development

```bash
goose -dir migrations postgres "$DATABASE_URL" down
```

#### Production

Create a new migration to reverse changes (never modify existing migrations):

```bash
goose -dir migrations create rollback_feature sql
# Write reversal SQL
git add . && git commit -m "fix(db): rollback feature"
# Rebuild, deploy, sync
```

### Prisma Schema Drift

```bash
# Reset Prisma from DB
pnpm prisma db pull

# Regenerate client
pnpm prisma generate
```

### Connection Issues

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1"

# From Kubernetes
kubectl run psql-test --rm -it --restart=Never \
  --image=postgres:16 \
  -- psql "$DATABASE_URL" -c "SELECT 1"
```

## Resources

- **goose Documentation**: https://github.com/pressly/goose
- **Prisma Documentation**: https://www.prisma.io/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/16/
- **Quick Reference**: `.ai/database.md`
