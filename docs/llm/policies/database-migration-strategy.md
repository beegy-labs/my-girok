# Database Migration Strategy

> **Version**: 1.0.0
> **Last Updated**: 2026-01-17
> **Status**: Active
> **Owner**: Platform Team

## Executive Summary

my-girok uses a **dual-tool approach** for database migrations:

- **goose**: SQL-based migrations (SSOT for schema changes)
- **Prisma**: TypeScript type generation (development productivity)

This strategy balances **GitOps principles**, **polyglot microservices**, and **zero licensing costs** while maintaining type safety in TypeScript services.

## Strategic Context

### Requirements

1. **GitOps-First**: All migrations tracked in `platform-gitops` repository
2. **Language Agnostic**: Support Node.js, Go, Python services
3. **Zero Cost**: No licensing fees or per-seat charges
4. **Type Safety**: TypeScript services need generated types
5. **Kubernetes Native**: Deploy via ArgoCD/FluxCD

### Decision Drivers

| Factor              | Weight   | Winner             |
| ------------------- | -------- | ------------------ |
| License Cost        | Critical | goose              |
| Language Neutrality | Critical | goose              |
| GitOps Support      | High     | goose/Atlas        |
| Type Generation     | High     | Prisma             |
| K8s Operator        | Medium   | Atlas (but costly) |

## Tool Comparison (2026)

### License Analysis

| Tool               | License         | Cost               | K8s Operator | Commercial Use   | Verdict          |
| ------------------ | --------------- | ------------------ | ------------ | ---------------- | ---------------- |
| **goose**          | MIT             | $0                 | ❌ Manual    | ✅ Unlimited     | ✅ **SELECTED**  |
| **Atlas**          | Apache 2.0 (CE) | $0 CE, $9/seat Pro | ❌ Pro Only  | ✅ Limited in CE | ❌ Too expensive |
| **Liquibase**      | FSL 1.1 (v5.0+) | $0 internal        | ❌ None      | ⚠️ Restricted    | ❌ License risk  |
| **Flyway**         | Apache 2.0 (CE) | $0 (100 schemas)   | ❌ None      | ✅ Limited       | ⚠️ Scale limit   |
| **Prisma Migrate** | Apache 2.0      | $0                 | ❌ None      | ✅ Yes           | ❌ Node.js only  |

### Key Findings

#### goose (MIT License)

```
✅ Truly open source (MIT = most permissive)
✅ Zero restrictions on commercial use
✅ Language-agnostic (pure SQL)
✅ Single binary (3MB, Go-based)
✅ Battle-tested since 2012
❌ No Kubernetes Operator
❌ Manual GitOps integration
```

**Reference**: [GitHub - pressly/goose](https://github.com/pressly/goose)

#### Atlas (Apache 2.0 / Proprietary)

```
✅ Schema-as-Code (declarative)
✅ Excellent GitOps tooling
✅ Kubernetes Operator available
❌ Operator is Pro-only ($9/seat/month)
❌ Community Edition lacks CI/CD integrations
❌ Requires Atlas token for advanced features
```

**Reference**: [Atlas Community Edition](https://atlasgo.io/community-edition)

**Cost Impact**:

- 10 developers = $1,080/year
- 50 developers = $5,400/year
- **Decision**: Not justified for migration tool

#### Liquibase (FSL 1.1 License)

```
⚠️ License changed Sept 2025 (Apache 2.0 → FSL)
⚠️ FSL = NOT true open source
⚠️ "Competing Use" clause restricts SaaS
✅ Internal CI/CD use still allowed
✅ Reverts to Apache 2.0 after 2 years
❌ Community backlash ongoing
```

**Reference**: [Liquibase License Discussion](https://github.com/keycloak/keycloak/discussions/43226)

**Risk Assessment**: License uncertainty makes long-term commitment risky.

#### Flyway (Apache 2.0)

```
✅ True open source (Community Edition)
❌ 100 schema limit (hard cap)
❌ Advanced features paywalled
❌ Teams edition sales discontinued (May 2025)
⚠️ Future unclear after Redgate acquisition
```

**Reference**: [Flyway Open Source](https://documentation.red-gate.com/fd/flyway-open-source-277579296.html)

## Selected Architecture

### Dual-Tool Approach

```
┌────────────────────────────────────────────────────────┐
│  platform-gitops Repository (Git = SSOT)               │
├────────────────────────────────────────────────────────┤
│  migrations/                                           │
│    ├── auth-service/                                   │
│    │     ├── 20260117000007_add_attendance.sql        │
│    │     └── 20260117000008_add_leave.sql             │
│    ├── analytics-service/                             │
│    └── ai-service/                                     │
│                                                        │
│  Tool: goose (SQL execution)                          │
│  Deploy: Kubernetes Job (ArgoCD PreSync Hook)         │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
                    PostgreSQL
                          ▲
                          │
┌────────────────────────────────────────────────────────┐
│  services/auth-service/                                │
│    ├── prisma/schema.prisma  (TypeScript types)       │
│    └── src/                                            │
│          └── attendance/services/                      │
│                └── attendance.service.ts               │
│                    → Uses: prisma.adminAttendance.*    │
│                                                        │
│  Tool: Prisma Client (type generation)                │
│  Generate: pnpm prisma generate                       │
└────────────────────────────────────────────────────────┘
```

### Why Two Tools?

| Tool       | Role             | Reason                                                 |
| ---------- | ---------------- | ------------------------------------------------------ |
| **goose**  | Schema Migration | Language-agnostic, GitOps-friendly, zero cost          |
| **Prisma** | Type Generation  | TypeScript productivity, IDE autocomplete, type safety |

**Key Principle**: Each tool does ONE thing well.

### Data Flow

```
1. Developer writes goose SQL migration
   └─> platform-gitops/migrations/auth-service/001_xxx.sql

2. GitOps applies migration via Kubernetes Job
   └─> goose up → PostgreSQL (tables created)

3. Developer syncs Prisma schema manually
   └─> prisma/schema.prisma (model definitions)

4. Generate TypeScript types
   └─> pnpm prisma generate → .prisma/client

5. Code uses typed API
   └─> prisma.adminAttendance.create({ ... })
```

## Implementation Guide

### Phase 1: goose Migration (Database)

**File**: `platform-gitops/migrations/auth-service/20260117000007_add_attendance.sql`

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

### Phase 2: Prisma Schema (TypeScript Types)

**File**: `services/auth-service/prisma/schema.prisma`

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

  @@unique([adminId, date], map: "admin_attendances_admin_id_date_key")
  @@map("admin_attendances")
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  REMOTE
  ON_LEAVE
  // ... (defined in schema)

  @@map("attendance_status")
}
```

**Critical**:

- Field names use camelCase (TypeScript convention)
- `@@map("table_name")` maps to goose table
- `@map("column_name")` maps to goose columns
- Must match goose SQL **exactly**

### Phase 3: Kubernetes Deployment

**File**: `platform-gitops/clusters/home/migrations/auth-service-job.yaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auth-service-migration
  namespace: default
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  ttlSecondsAfterFinished: 600
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: auth-service-migration
    spec:
      restartPolicy: Never
      serviceAccountName: migration-runner
      containers:
        - name: goose
          image: pressly/goose:v3.21.1 # Pin version
          command:
            - /bin/sh
            - -c
            - |
              goose -dir=/migrations postgres "$DATABASE_URL" up
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

**ConfigMap** (generated from Git):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-service-migrations
  namespace: default
data:
  20260117000007_add_attendance.sql: |
    -- +goose Up
    CREATE TABLE admin_attendances (
      ...
    );
    -- +goose Down
    DROP TABLE IF EXISTS admin_attendances;
```

### Phase 4: ArgoCD Integration

**Application**:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: auth-service
spec:
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
    automated:
      prune: true
      selfHeal: true
  source:
    repoURL: https://gitea.girok.dev/beegy-labs/platform-gitops.git
    path: clusters/home/auth-service
    targetRevision: main
```

**Hook Order**:

1. **PreSync**: Migration Job runs first
2. **Sync**: Application deployment
3. **PostSync**: Health checks

## Workflow

### Adding New Migration

```bash
# 1. Create goose migration
cd platform-gitops/migrations/auth-service
goose create add_new_feature sql

# 2. Edit SQL file
vim 20260117000009_add_new_feature.sql

# 3. Test locally
goose -dir . postgres "postgresql://localhost:5432/test" up

# 4. Commit to GitOps
git add 20260117000009_add_new_feature.sql
git commit -m "feat(migration): add new feature table"
git push

# 5. Update Prisma schema
cd services/auth-service/prisma
vim schema.prisma  # Add model

# 6. Generate types
pnpm prisma generate

# 7. Commit code changes
git add prisma/schema.prisma
git commit -m "feat(schema): add Prisma model for new feature"
git push

# 8. ArgoCD auto-deploys migration
# 9. Deploy application
```

### Manual Synchronization Checklist

When adding a table:

- [ ] Create goose SQL migration
- [ ] Define Prisma model with `@@map("table_name")`
- [ ] Match all column types exactly
- [ ] Add indexes with `@@index` if in SQL
- [ ] Run `pnpm prisma generate`
- [ ] Verify types in IDE
- [ ] Write tests using Prisma Client

## Tradeoffs

### Accepted Tradeoffs

| Aspect             | Tradeoff                           | Mitigation                            |
| ------------------ | ---------------------------------- | ------------------------------------- |
| **Manual Sync**    | goose & Prisma must match manually | Code review checklist, documentation  |
| **No Operator**    | Manual ArgoCD Hook setup           | Template once, reuse everywhere       |
| **Learning Curve** | Team learns two tools              | Clear documentation, onboarding guide |

### Rejected Alternatives

| Tool               | Why Rejected                        |
| ------------------ | ----------------------------------- |
| **Prisma Migrate** | Node.js only, not language-agnostic |
| **Atlas Pro**      | $9/seat/month too expensive         |
| **Liquibase**      | FSL license not true open source    |
| **TypeORM**        | Tight coupling, Node.js only        |

## Future Roadmap

### Short-term (Q1 2026)

- [ ] Document all existing migrations
- [ ] Add Prisma models for Phase 1-3
- [ ] Create migration job templates
- [ ] Write developer onboarding guide

### Medium-term (Q2-Q3 2026)

- [ ] Automate Prisma schema sync (experimental)
- [ ] Add migration testing in CI/CD
- [ ] Implement drift detection alerts
- [ ] Create migration rollback playbook

### Long-term (Q4 2026+)

- [ ] **Re-evaluate Atlas** if pricing changes
- [ ] Investigate schema-as-code generators
- [ ] Consider migration observability (OpenTelemetry)
- [ ] Explore multi-tenant migration patterns

## Monitoring & Observability

### Key Metrics

```yaml
# Prometheus metrics
migration_duration_seconds{service="auth-service"}
migration_failure_total{service="auth-service"}
migration_version{service="auth-service", version="20260117000007"}
```

### Alerts

```yaml
# Alert on migration failures
- alert: MigrationFailed
  expr: migration_failure_total > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: 'Database migration failed for {{ $labels.service }}'
```

## Security Considerations

### Secrets Management

```
✅ DO: Use Kubernetes Secrets for DATABASE_URL
✅ DO: Rotate credentials regularly
✅ DO: Use least-privilege service accounts
❌ DON'T: Hardcode credentials in SQL files
❌ DON'T: Commit .env files to Git
```

### RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: migration-runner
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: migration-runner
rules:
  - apiGroups: ['']
    resources: ['configmaps', 'secrets']
    verbs: ['get', 'list']
```

## Compliance & Audit

### Change Tracking

All migrations tracked in Git:

- **Who**: Git commit author
- **What**: SQL diff
- **When**: Git commit timestamp
- **Why**: Commit message

### Rollback Strategy

```bash
# Rollback last migration
goose -dir migrations/auth-service postgres "$DB_URL" down

# Rollback to specific version
goose -dir migrations/auth-service postgres "$DB_URL" down-to 20260117000007
```

## FAQs

### Q: Why not use only Prisma Migrate?

**A**: Prisma Migrate is Node.js-specific. We have Go, Python services that need the same migrations. goose works for all languages.

### Q: Why not use Atlas Community Edition?

**A**: CE lacks Kubernetes Operator, which is critical for GitOps. Pro is $9/seat/month, too expensive for migration tool.

### Q: What if goose and Prisma schema get out of sync?

**A**: Code review enforces checklist. Integration tests catch mismatches. Document emphasizes manual sync process.

### Q: Can we auto-generate Prisma schema from goose SQL?

**A**: Not reliably. SQL → Prisma conversion loses context (relations, etc.). Manual definition is safer.

### Q: How to handle migration failures in production?

**A**:

1. Job fails → ArgoCD stops deployment
2. Fix migration in Git
3. Push → ArgoCD retries
4. If unfixable → Manual rollback via goose down

## References

### Documentation

- [goose Documentation](https://pressly.github.io/goose/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [ArgoCD Resource Hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)

### Research Sources

- [Atlas vs Classic Migration Tools](https://atlasgo.io/atlas-vs-others) (2024)
- [GitOps for Databases on Kubernetes](https://thenewstack.io/gitops-for-databases-on-kubernetes/) (2024)
- [Zero-Downtime Database Migration Patterns](https://medium.com/@yashbatra11111/zero-downtime-database-migration-language-agnostic-patterns-that-work-451c2d72cb00) (2024)
- [Liquibase FSL License Discussion](https://github.com/keycloak/keycloak/discussions/43226) (2025)

### Internal Docs

- `.ai/database.md` - Quick reference
- `docs/llm/policies/best-practices-2026.md` - Annual best practices review
- `.ai/architecture.md` - System architecture overview

## Changelog

| Version | Date       | Changes                   |
| ------- | ---------- | ------------------------- |
| 1.0.0   | 2026-01-17 | Initial strategy document |

---

**Document Owner**: Platform Team
**Review Cycle**: Annual (Q1)
**Next Review**: 2027-01-15
