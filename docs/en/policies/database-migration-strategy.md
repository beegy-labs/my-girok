# Database Migration Strategy

> Dual-tool approach using goose and Prisma

**Version**: 1.0.0 | **Status**: Active | **Owner**: Platform Team

## Overview

This document defines the database migration strategy using a dual-tool approach: goose for migrations and Prisma for TypeScript type generation.

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

**Critical**: Use `@@map()` for tables, `@map()` for columns to match SQL naming.

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
```

## Related Documentation

- Operations & Troubleshooting: `docs/en/policies/database-migration-strategy-ops.md`
- [goose Documentation](https://pressly.github.io/goose/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

_This document is auto-generated from `docs/llm/policies/database-migration-strategy.md`_
