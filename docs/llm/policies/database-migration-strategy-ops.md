# Database Migration Strategy - Operations

> Kubernetes deployment, synchronization, security, monitoring, and rollback

## Kubernetes Deployment

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

---

_Main: `database-migration-strategy.md`_
