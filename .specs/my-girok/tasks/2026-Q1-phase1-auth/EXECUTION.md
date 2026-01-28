# Execution Guide: Phase 1-A Authentication

> Step-by-step guide for dev environment deployment

## Overview

This guide covers execution of Phase 1-A tasks in the **dev environment** (Kubernetes cluster).

## Prerequisites

### Required Access

- [ ] kubectl configured for target cluster
- [ ] GitHub access (repository write permission)
- [ ] Vault root token (provided separately, never commit to git)

### Required Tools

```bash
# Check installed tools
kubectl version --client
gh --version
git --version
```

## Execution Flow

```
Phase 1: Preparation (Local + Vault)
  Task 01: Database Audit ✅ (Already completed)
  Task 02: Vault Root Token Setup
  ↓
Phase 2: Code Changes (Local)
  Task 03: Seed File Modification
  Task 04: Code Changes (Domain Auth + JWT)
  ↓
Phase 3: Deployment (CI/CD)
  Task 05: PR Creation & Merge
  Task 06: CI/CD Deployment (GitHub Actions)
  ↓
Phase 4: Database (Kubernetes)
  Task 07: Database Migration & Seed
  ↓
Phase 5: Verification (Manual)
  Task 08: Admin UI Testing
  Task 09: Documentation
```

## Quick Start

### 1. Vault Setup (One-time)

```bash
# Set token (DO NOT commit this command to git)
export VAULT_ROOT_TOKEN="<provided-by-user>"

# Create Kubernetes secret
kubectl create secret generic vault-token \
  --from-literal=token="${VAULT_ROOT_TOKEN}" \
  -n vault \
  --dry-run=client -o yaml | kubectl apply -f -

# Verify
kubectl get secret vault-token -n vault

# Clear token
unset VAULT_ROOT_TOKEN
```

**Detailed**: See Task 02

### 2. Code Changes (Local Development)

```bash
# Clone and branch
cd /Users/vero/workspace/beegy/my-girok
git checkout develop
git pull origin develop
git checkout -b feat/my-girok-service-registration

# Edit seed file
code services/auth-service/prisma/seed/services-seed.ts
# (See Task 03 for detailed changes)

# Edit auth-service code
# (See Task 04 for detailed changes)

# Commit
git add services/auth-service/
git add services/auth-bff/
git add packages/types/
git commit -m "feat: Phase 1-A - my-girok service registration"
```

**Detailed**: See Tasks 03-04

### 3. Deploy via CI/CD

```bash
# Push and create PR
git push origin feat/my-girok-service-registration

gh pr create \
  --title "feat: Phase 1-A - my-girok Service Registration" \
  --body "See .specs/my-girok/tasks/2026-Q1-phase1-auth/05-pr-creation-merge.md" \
  --base develop

# Wait for CI checks to pass
gh pr checks --watch

# Merge
gh pr merge --squash --delete-branch

# Monitor deployment
gh run list --branch develop --limit 5
gh run watch <run-id>
```

**Detailed**: See Tasks 05-06

### 4. Database Seed (Kubernetes)

```bash
# Get auth-service pod
POD=$(kubectl get pods -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it ${POD} -- pnpm prisma migrate deploy

# Run seed
kubectl exec -it ${POD} -- /bin/sh -c "
  cd prisma/seed && \
  npx ts-node services-seed.ts && \
  npx ts-node consent-requirements-seed.ts && \
  npx ts-node legal-documents-seed.ts
"

# Verify
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT slug, name FROM services WHERE slug='my-girok';"
```

**Detailed**: See Task 07

### 5. Test Admin UI

```bash
# Port-forward
kubectl port-forward svc/web-admin 5174:80

# Open browser
open http://localhost:5174

# Login and verify:
# - Services → my-girok exists
# - Config, Countries, Locales, Consents tabs work
```

**Detailed**: See Task 08

## Task Reference

| #   | Task                        | Type     | Estimated Time |
| --- | --------------------------- | -------- | -------------- |
| 01  | Database Audit              | Analysis | ✅ Done        |
| 02  | Vault Root Token Setup      | K8s      | 5 min          |
| 03  | Seed File Modification      | Code     | 15 min         |
| 04  | Code Changes (Domain + JWT) | Code     | 30 min         |
| 05  | PR Creation & Merge         | Git      | 10 min         |
| 06  | CI/CD Deployment            | Wait     | 10-15 min      |
| 07  | Database Migration & Seed   | K8s      | 5 min          |
| 08  | Admin UI Testing            | Manual   | 15 min         |
| 09  | Documentation               | Docs     | 10 min         |

**Total**: ~2 hours (excluding code review wait time)

## Verification Commands

### After Task 02 (Vault)

```bash
kubectl get secret vault-token -n vault
```

### After Task 06 (Deployment)

```bash
kubectl get pods -l app=auth-service
kubectl get pods -l app=auth-bff
kubectl logs -f deployment/auth-service
```

### After Task 07 (Database)

```bash
POD=$(kubectl get pods -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it ${POD} -- psql ${DATABASE_URL} << 'EOF'
SELECT s.slug, COUNT(ssc.id) as countries, COUNT(ssl.id) as locales
FROM services s
LEFT JOIN service_supported_countries ssc ON s.id = ssc.service_id
LEFT JOIN service_supported_locales ssl ON s.id = ssl.service_id
WHERE s.slug = 'my-girok'
GROUP BY s.slug;
EOF

# Expected:
#    slug    | countries | locales
# -----------+-----------+---------
#  my-girok  |         3 |       3
```

### After Task 08 (Admin UI)

```bash
# Port-forward and test
kubectl port-forward svc/web-admin 5174:80 &
curl -s http://localhost:5174 | grep -q "my-girok" && echo "✅ Admin UI accessible"
pkill -f "port-forward.*web-admin"
```

## Troubleshooting

### Issue: kubectl not configured

```bash
# Get kubeconfig from cluster admin
export KUBECONFIG=/path/to/kubeconfig
kubectl config use-context <cluster-name>
```

### Issue: CI checks failing

```bash
# View failure logs
gh run view <run-id> --log

# Common fixes:
# - Fix TypeScript errors
# - Fix lint violations
# - Re-run proto build if hash mismatch
```

### Issue: Pod not starting

```bash
# Check pod status
kubectl get pods -l app=auth-service
kubectl describe pod <pod-name>
kubectl logs <pod-name>

# Common causes:
# - Image pull error (check registry access)
# - Database connection error (check DATABASE_URL secret)
# - Missing environment variables
```

### Issue: Database connection failed

```bash
# Check secret exists
kubectl get secret auth-service-secret -o yaml

# Test connection from pod
POD=$(kubectl get pods -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c "SELECT 1;"
```

## Security Reminders

⚠️ **CRITICAL**:

- **NEVER** commit Vault root token to git
- **NEVER** save secrets in .specs/ or docs/ directories
- **ALWAYS** use kubectl to manage secrets
- **ALWAYS** clear sensitive environment variables after use

## Success Criteria

Phase 1-A is complete when:

- [x] Task 01: Database Audit completed
- [ ] Task 02: Vault token stored in Kubernetes
- [ ] Task 03: Seed file updated for my-girok
- [ ] Task 04: Domain auth and JWT code changes implemented
- [ ] Task 05: PR merged to develop
- [ ] Task 06: Services deployed to dev
- [ ] Task 07: Database seeded with my-girok
- [ ] Task 08: Admin UI shows my-girok service
- [ ] Task 09: Documentation updated

## Next Phase

→ **Phase 1-B: Core Features**

See: `.specs/my-girok/scopes/2026-Q1-phase2-core.md`

Objectives:

- Resume CRUD operations
- File upload (MinIO)
- PDF export
- Public profile sharing

## Support

For issues:

1. Check individual task files for detailed troubleshooting
2. Review pod logs: `kubectl logs -f deployment/<service>`
3. Check GitHub Actions logs: `gh run view <run-id> --log`
4. Verify database state: `kubectl exec -it ${POD} -- psql ${DATABASE_URL}`
