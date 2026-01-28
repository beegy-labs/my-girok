# Tasks: 2026-Q1 Phase 1 - Authentication

> 로그인/회원가입 정상화 | Target: Identity Platform integration | Deploy to **dev environment**

## Status

| Total | Done | Progress | Pending |
| ----- | ---- | -------- | ------- |
| 9     | 1    | 0        | 8       |

## Dependencies

```
[01] Database Audit ✅
       |
       v
[02] Vault Root Token Setup
       |
       v
[03] Seed File Modification
       |
       v
[04] Code Changes (Domain Auth + JWT)
       |
       v
[05] PR Creation & Merge
       |
       v
[06] CI/CD Deployment (develop branch → dev environment)
       |
       v
[07] Database Migration & Seed Execution
       |
       v
[08] Admin UI Testing
       |
       v
[09] Documentation
```

## Deployment Environment

**Target**: dev environment (Kubernetes cluster)

- Branch: `develop`
- Namespace: `default` or `my-girok-dev`
- GitOps: `platform-gitops` repository
- Values file: `clusters/home/values/platform-auth-service-dev.yaml`

## Summary

| #   | Task                      | Target                  | Type     | Status  |
| --- | ------------------------- | ----------------------- | -------- | ------- |
| 01  | Database Audit            | auth_db                 | Analysis | ✅ Done |
| 02  | Vault Root Token Setup    | Kubernetes Secret       | K8s      | Pending |
| 03  | Seed File Modification    | services-seed.ts        | Code     | Pending |
| 04  | Code Changes              | auth-service, auth-bff  | Code     | Pending |
| 05  | PR Creation & Merge       | GitHub                  | Git      | Pending |
| 06  | CI/CD Deployment          | GitHub Actions → ArgoCD | CI/CD    | Pending |
| 07  | Database Migration & Seed | K8s Job                 | K8s      | Pending |
| 08  | Admin UI Testing          | web-admin               | Manual   | Pending |
| 09  | Documentation             | docs/                   | Docs     | Pending |

## Execution Flow

### Phase 1: Preparation (Local)

1. **Task 01**: Database Audit ✅
2. **Task 02**: Vault Root Token Setup (kubectl)
3. **Task 03**: Seed File Modification (my-girok service)
4. **Task 04**: Code Changes (Domain Auth + JWT)

### Phase 2: Deployment (CI/CD)

5. **Task 05**: PR Creation & Merge → develop branch
6. **Task 06**: Wait for CI/CD deployment completion
7. **Task 07**: Execute DB migration & seed in K8s

### Phase 3: Verification (Manual)

8. **Task 08**: Admin UI Testing (dev.girok.dev or port-forward)
9. **Task 09**: Documentation update

## Verification Commands

```bash
# After Task 02: Vault Token
kubectl get secret vault-token -n vault

# After Task 06: CI/CD Deployment
kubectl get pods -l app=auth-service
kubectl logs -f deployment/auth-service

# After Task 07: Database Seed
kubectl exec -it deployment/auth-service -- \
  psql $DATABASE_URL -c "SELECT slug, name FROM services WHERE slug='my-girok';"

# After Task 08: Admin UI
# Option 1: Port-forward
kubectl port-forward svc/web-admin 5174:80
open http://localhost:5174/services

# Option 2: Ingress (if configured)
open https://admin.dev.girok.dev/services
```

## Quick Reference

- **Service slug**: `my-girok`
- **Domains**: `my-girok.com`, `dev.girok.dev`, `localhost:5173`, `localhost:4002`
- **Countries**: KR, US, JP, IN, IN
- **Locales**: ko, en, ja, hi, hi
- **Required consents**: TERMS_OF_SERVICE, PRIVACY_POLICY
- **GitOps file**: `clusters/home/values/platform-auth-service-dev.yaml`

## Important Notes

### Security

- ⚠️ **NEVER** commit Vault root token to git
- ⚠️ **NEVER** save secrets in `.specs/` or `docs/` directories
- ✅ Vault token stored only in Kubernetes Secret via kubectl

### CI/CD Trigger

Code changes in these paths trigger CI/CD:

- `services/auth-service/**`
- `services/auth-bff/**`
- `services/identity-service/**`
- `packages/**`

## Detailed Implementation

See individual task files for step-by-step instructions.
