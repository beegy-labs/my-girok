# Task 06: CI/CD Deployment

> Monitor and verify deployment to dev environment

## Goal

Ensure CI/CD pipeline completes successfully and services are deployed to dev environment.

## Prerequisites

- [x] Task 05 completed (PR merged to develop)
- [ ] GitHub Actions triggered
- [ ] kubectl configured for cluster access

## Deployment Flow

```
GitHub Push (develop)
    ↓
GitHub Actions
    ├─ Build Docker images
    │  └─ auth-service: gitea.girok.dev/beegy-labs/auth-service:develop-<sha>
    │  └─ auth-bff: gitea.girok.dev/beegy-labs/auth-bff:develop-<sha>
    ↓
Update GitOps Repo
    ├─ platform-gitops/clusters/home/values/platform-auth-service-dev.yaml
    └─ platform-gitops/clusters/home/values/platform-auth-bff-dev.yaml
    ↓
ArgoCD/Flux Sync
    ↓
Kubernetes Deployment (dev namespace)
```

## Monitoring Steps

### 1. Monitor GitHub Actions

```bash
# List recent runs
gh run list --branch develop --limit 5

# Expected output:
# STATUS  TITLE                              WORKFLOW          BRANCH   EVENT  ID
# ✓       feat: Phase 1-A - my-girok...     CI - Auth Service develop  push   1234567
# ✓       feat: Phase 1-A - my-girok...     CI - Auth BFF     develop  push   1234568

# Watch specific run
gh run watch <run-id>

# Or view run details
gh run view <run-id>
```

### 2. Check Docker Images

```bash
# Verify images pushed to Gitea registry
# Get SHA from merged commit
git log --oneline -1 develop | cut -c1-7

# Expected image tags:
# - gitea.girok.dev/beegy-labs/auth-service:develop-<sha>
# - gitea.girok.dev/beegy-labs/auth-bff:develop-<sha>
```

### 3. Verify GitOps Update

```bash
# Clone GitOps repo (if not already)
git clone https://github.com/beegy-labs/platform-gitops /tmp/platform-gitops
cd /tmp/platform-gitops

# Pull latest
git pull origin main

# Check updated values
git log --oneline -3

# Expected commit:
# chore(development): update auth-service to develop-<sha>
# chore(development): update auth-bff to develop-<sha>

# Verify image tags
grep "tag:" clusters/home/values/platform-auth-service-dev.yaml
grep "tag:" clusters/home/values/platform-auth-bff-dev.yaml

# Expected:
# tag: "develop-<sha>"
```

### 4. Monitor Kubernetes Deployment

```bash
# Check current pods
kubectl get pods -l app=auth-service
kubectl get pods -l app=auth-bff

# Expected: New pods with recent timestamps

# Watch deployment rollout
kubectl rollout status deployment/auth-service
kubectl rollout status deployment/auth-bff

# Expected:
# deployment "auth-service" successfully rolled out
# deployment "auth-bff" successfully rolled out
```

### 5. Check Pod Logs

```bash
# Auth Service logs
kubectl logs -f deployment/auth-service --tail=50

# Expected: No errors, service started successfully

# Auth BFF logs
kubectl logs -f deployment/auth-bff --tail=50

# Expected: No errors, service started successfully
```

### 6. Health Check

```bash
# Port-forward to test (if no ingress configured)
kubectl port-forward svc/auth-service 3002:3002 &
kubectl port-forward svc/auth-bff 4001:4001 &

# Test health endpoints
curl http://localhost:3002/health
curl http://localhost:4001/health

# Expected: {"status": "ok"}

# Stop port-forward
pkill -f "port-forward"
```

## Verification Checklist

- [ ] GitHub Actions completed successfully
- [ ] Docker images pushed to Gitea registry
- [ ] GitOps repository updated with new image tags
- [ ] Kubernetes pods rolled out successfully
- [ ] No errors in pod logs
- [ ] Health checks passing

## Deployment Timeline

Typical timeline:

- GitHub Actions: 5-10 minutes
- GitOps update: < 1 minute
- ArgoCD/Flux sync: 1-3 minutes (default sync interval)
- Pod rollout: 1-2 minutes

**Total**: ~10-15 minutes from merge to deployment

## Troubleshooting

### Issue: GitHub Actions Failed

Check failure reason:

```bash
gh run view <run-id> --log
```

Common failures:

- Build errors (fix code, push new commit)
- Image already exists (use workflow_dispatch with force_build)
- GitOps push failed (check GITOPS_PAT secret)

### Issue: Pod CrashLoopBackOff

Check logs:

```bash
kubectl logs deployment/auth-service --tail=100
```

Common causes:

- Database connection failed (check DATABASE_URL secret)
- Missing environment variables
- Prisma client not generated

Fix and redeploy:

```bash
# Option 1: Fix code and merge new PR

# Option 2: Force rebuild
gh workflow run ci-auth-service.yml --ref develop -f force_build=true
```

### Issue: ArgoCD Not Syncing

Check ArgoCD status:

```bash
# If ArgoCD CLI installed
argocd app get my-girok-dev

# Or check ArgoCD UI
open https://argocd.girok.dev
```

Force sync:

```bash
argocd app sync my-girok-dev
```

### Issue: Pod Pending (ImagePullBackOff)

Check events:

```bash
kubectl describe pod <pod-name>
```

Verify image exists:

```bash
curl -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/api/v1/packages/beegy-labs/container/auth-service"
```

## Next Steps

→ Task 07: Database Migration & Seed Execution
