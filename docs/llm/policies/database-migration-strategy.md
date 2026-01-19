# Database Migration Strategy

```yaml
version: 1.0.0
updated: 2026-01-17
status: Active
owner: Platform Team
```

## Strategy

**Dual-tool approach**: goose (migrations) + Prisma (types)

## Tool Selection

| Tool               | License    | Cost          | K8s Operator | Verdict         |
| ------------------ | ---------- | ------------- | ------------ | --------------- |
| **goose**          | MIT        | $0            | ❌           | ✅ **SELECTED** |
| **Atlas**          | Apache 2.0 | $9/seat/month | Pro Only     | ❌ Expensive    |
| **Liquibase**      | FSL 1.1    | $0            | ❌           | ❌ License risk |
| **Flyway**         | Apache 2.0 | $0            | ❌           | ⚠️ Scale limit  |
| **Prisma Migrate** | Apache 2.0 | $0            | ❌           | ❌ Node.js only |

**Decision**: goose (MIT, language-agnostic, zero cost) + Prisma (TypeScript types)

## Architecture

```yaml
migrations:
  location: platform-gitops/migrations/{service}/
  format: SQL
  tool: goose
  deployment: Kubernetes Job (ArgoCD PreSync Hook)

types:
  location: services/{service}/prisma/schema.prisma
  format: Prisma DSL
  tool: Prisma Client
  generation: pnpm prisma generate
```

## Data Flow

| Step | Action                    | Tool          | Output                     |
| ---- | ------------------------- | ------------- | -------------------------- |
| 1    | Write SQL migration       | goose         | `001_xxx.sql`              |
| 2    | Apply to database         | K8s Job+goose | PostgreSQL tables          |
| 3    | Sync Prisma schema        | Manual        | `schema.prisma`            |
| 4    | Generate TypeScript types | Prisma        | `.prisma/client`           |
| 5    | Use typed API             | Code          | `prisma.table.create(...)` |

## Implementation

### goose Migration

```sql
-- +goose Up
CREATE TABLE admin_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  admin_id TEXT NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ(6),
  clock_out TIMESTAMPTZ(6),
  status attendance_status DEFAULT 'PRESENT',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE(admin_id, date)
);

-- +goose Down
DROP TABLE IF EXISTS admin_attendances;
```

### Prisma Schema

```prisma
model AdminAttendance {
  id        String           @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  adminId   String           @map("admin_id")
  date      DateTime         @db.Date
  clockIn   DateTime?        @map("clock_in") @db.Timestamptz(6)
  clockOut  DateTime?        @map("clock_out") @db.Timestamptz(6)
  status    AttendanceStatus @default(PRESENT)
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime         @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@unique([adminId, date])
  @@map("admin_attendances")
}
```

**Critical**: Use `@@map()` for tables, `@map()` for columns to match SQL

### Kubernetes Deployment

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auth-service-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  ttlSecondsAfterFinished: 600
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: migration-runner
      containers:
        - name: goose
          image: pressly/goose:v3.21.1
          command: ['/bin/sh', '-c', 'goose -dir=/migrations postgres "$DATABASE_URL" up']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-service-db
                  key: connection-string
          volumeMounts:
            - name: migrations
              mountPath: /migrations
              readOnly: true
      volumes:
        - name: migrations
          configMap:
            name: auth-service-migrations
```

## Workflow

```bash
# 1. Create migration
cd platform-gitops/migrations/auth-service
goose create add_feature sql

# 2. Test locally
goose -dir . postgres "postgresql://localhost:5432/test" up

# 3. Commit to GitOps
git add *.sql && git commit -m "feat(migration): add feature table" && git push

# 4. Update Prisma schema
cd services/auth-service/prisma
vim schema.prisma  # Add model with @@map()

# 5. Generate types
pnpm prisma generate

# 6. Commit code
git add prisma/schema.prisma && git commit -m "feat(schema): add Prisma model" && git push
```

## Synchronization Checklist

- [ ] Create goose SQL migration
- [ ] Define Prisma model with `@@map("table_name")`
- [ ] Match all column types exactly
- [ ] Add indexes with `@@index` if in SQL
- [ ] Run `pnpm prisma generate`
- [ ] Write tests using Prisma Client

## Tradeoffs

| Aspect             | Tradeoff              | Mitigation                 |
| ------------------ | --------------------- | -------------------------- |
| **Manual Sync**    | goose ≠ Prisma manual | Code review checklist      |
| **No Operator**    | Manual K8s setup      | Template reuse             |
| **Learning Curve** | Two tools             | Documentation + onboarding |

## Security

```yaml
secrets:
  storage: Kubernetes Secrets
  rotation: Regular schedule
  rbac: Least-privilege service accounts

validation:
  - HTTPS callback URLs
  - Domain whitelist
  - No hardcoded credentials
```

## Monitoring

```yaml
metrics:
  - migration_duration_seconds{service="auth-service"}
  - migration_failure_total{service="auth-service"}
  - migration_version{service="auth-service", version="20260117000007"}

alerts:
  - name: MigrationFailed
    expr: migration_failure_total > 0
    severity: critical
```

## Rollback

```bash
# Rollback last migration
goose -dir migrations/auth-service postgres "$DB_URL" down

# Rollback to specific version
goose -dir migrations/auth-service postgres "$DB_URL" down-to 20260117000007
```

## Roadmap

### Q1 2026

- [ ] Document existing migrations
- [ ] Add Prisma models for Phase 1-3
- [ ] Create migration job templates

### Q2-Q3 2026

- [ ] Automate Prisma schema sync (experimental)
- [ ] Add migration testing in CI/CD
- [ ] Implement drift detection

### Q4 2026+

- [ ] Re-evaluate Atlas if pricing changes
- [ ] Investigate schema-as-code generators
- [ ] Multi-tenant migration patterns

## References

- [goose Documentation](https://pressly.github.io/goose/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [ArgoCD Hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- `.ai/database.md` - Quick reference
