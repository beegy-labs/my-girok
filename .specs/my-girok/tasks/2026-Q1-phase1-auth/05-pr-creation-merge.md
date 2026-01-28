# Task 05: PR Creation & Merge

> Create pull request and merge to develop branch

## Goal

Create PR, pass CI checks, and merge changes to trigger deployment.

## Prerequisites

- [x] Task 01 completed (Database Audit)
- [x] Task 02 completed (Vault Root Token Setup)
- [x] Task 03 completed (Seed File Modification)
- [x] Task 04 completed (Code Changes)
- [ ] All commits pushed to feature branch

## Steps

### 1. Push Feature Branch

```bash
cd /Users/vero/workspace/beegy/my-girok

# Verify current branch
git branch --show-current
# Expected: feat/my-girok-service-registration

# Verify commits
git log --oneline develop..HEAD
# Expected:
#   <sha> feat: implement domain-based auth and JWT enhancement
#   <sha> feat: replace test services with my-girok service in seed

# Push to remote
git push origin feat/my-girok-service-registration
```

### 2. Create Pull Request

#### Option A: GitHub CLI

```bash
gh pr create \
  --title "feat: Phase 1-A - my-girok Service Registration" \
  --body "$(cat <<'EOF'
## Summary

Implements Phase 1-A (Authentication) for my-girok service recovery:

1. **Seed File Modification**: Replace test services with my-girok service
2. **Domain-Based Auth**: Detect service from Origin header
3. **JWT Enhancement**: Include services array in JWT payload

## Changes

### Services Seed (`auth-service/prisma/seed/services-seed.ts`)
- Remove test services (homeshopping, ads, legal, dev)
- Add my-girok service with full metadata
- Seed all related tables (configs, countries, locales, consents)

### Auth Service
- Add `getServiceFromDomain()` method
- Add domain endpoint: `GET /v1/services/domain/:domain`
- Update JWT payload to include services array

### Auth BFF
- Detect service from Origin header in login/register
- Auto-join user to detected service
- Proxy domain lookup to auth-service

### Types
- Add `services` field to JwtPayload interface
- Add JwtService interface

## Testing

- [x] TypeScript compilation passes
- [x] Lint checks pass
- [x] Local manual testing completed

## Deployment

- Target: dev environment
- Branch: develop
- CI will trigger on merge

## Related

- Scope: `.specs/my-girok/scopes/2026-Q1-phase1-auth.md`
- Tasks: `.specs/my-girok/tasks/2026-Q1-phase1-auth/`

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)" \
  --base develop \
  --head feat/my-girok-service-registration
```

#### Option B: GitHub Web UI

1. Go to: https://github.com/beegy-labs/my-girok/compare
2. Select base: `develop`
3. Select compare: `feat/my-girok-service-registration`
4. Click "Create pull request"
5. Fill in title and description (use text from Option A)

### 3. Wait for CI Checks

Monitor CI status:

```bash
gh pr checks

# Or watch in real-time
gh pr checks --watch
```

Expected checks:

- ✅ CI - Auth Service (Check: test & lint)
- ✅ CI - Auth BFF (Check: test & lint)
- ✅ Proto files download
- ✅ TypeScript compilation

### 4. Review and Address Feedback

If CI fails:

```bash
# Pull latest changes
git pull origin feat/my-girok-service-registration

# Fix issues
# ...

# Commit fixes
git add .
git commit -m "fix: address CI feedback"

# Push
git push origin feat/my-girok-service-registration
```

### 5. Merge Pull Request

#### Option A: GitHub CLI

```bash
# Squash merge (recommended for feature branches)
gh pr merge --squash --delete-branch

# Or merge commit (preserves history)
gh pr merge --merge --delete-branch
```

#### Option B: GitHub Web UI

1. Go to PR page
2. Click "Squash and merge" or "Merge pull request"
3. Confirm merge
4. Delete branch (optional)

### 6. Verify Merge

```bash
# Switch to develop
git checkout develop
git pull origin develop

# Verify commits
git log --oneline -3

# Expected to see merged commits
```

## CI/CD Trigger

After merge to `develop` branch, GitHub Actions will:

1. Build Docker images for changed services
2. Push images to Gitea registry (gitea.girok.dev)
3. Update GitOps repository values files
4. ArgoCD/Flux will detect changes and deploy

## Monitoring Deployment

```bash
# Check GitHub Actions
gh run list --branch develop --limit 5

# Watch specific run
gh run watch <run-id>
```

## Verification

- [ ] PR created successfully
- [ ] All CI checks passed
- [ ] PR merged to develop branch
- [ ] GitHub Actions triggered
- [ ] No conflicts or errors

## Troubleshooting

### Issue: CI checks failing

Check logs:

```bash
gh run view <run-id> --log
```

Common issues:

- TypeScript compilation errors
- Lint violations
- Test failures
- Proto files not found

### Issue: Merge conflicts

Resolve conflicts:

```bash
git checkout feat/my-girok-service-registration
git pull origin develop
# Resolve conflicts
git add .
git commit -m "chore: resolve merge conflicts"
git push origin feat/my-girok-service-registration
```

### Issue: Proto hash mismatch

Trigger proto build:

```bash
# GitHub UI → Actions → Build Proto → Run workflow → develop
```

Or push to packages/proto:

```bash
git commit --allow-empty -m "chore: trigger proto build"
git push
```

## Next Steps

→ Task 06: CI/CD Deployment (wait for completion)
