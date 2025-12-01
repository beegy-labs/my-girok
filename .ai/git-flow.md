# Git Flow Quick Reference

## Branch Structure (GitFlow Standard)

```
feat/* ──squash──▶ develop ──merge──▶ release ──merge──▶ main
                    (Dev)    (Staging)   (Prod)
```

## Branch Types

| Branch | Purpose | Lifetime | Environment |
|--------|---------|----------|-------------|
| `main` | Production-ready code | Permanent | Production |
| `release` | Staging/QA validation | Permanent | Staging |
| `develop` | Development integration | Permanent | Development |
| `feat/*`, `fix/*` | Feature/fix branches | Temporary | - |
| `hotfix/*` | Production emergency fixes | Temporary | - |

## Merge Strategy (GitFlow Standard)

| Source → Target | Merge Type | Command | Rationale |
|-----------------|------------|---------|-----------|
| feat → develop | **Squash** | `gh pr merge --squash` | Atomic feature commit, clean history |
| develop → release | **Merge** | `gh pr merge --merge` | Preserve integration history, promotion record |
| release → main | **Merge** | `gh pr merge --merge` | Release point tracking, prod sync |
| hotfix → main | **Merge** | `gh pr merge --merge` | Emergency fix tracking |
| hotfix → develop | **Merge** | `gh pr merge --merge` | Backport fix to develop |

## Common Workflows

### Feature Development (feat → develop)

```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feat/new-feature

# 2. Work and commit
git add .
git commit -m "feat(scope): description"

# 3. Push and create PR
git push -u origin feat/new-feature
gh pr create --base develop --title "feat(scope): Title" --body "..."

# 4. Squash merge (after review)
gh pr merge --squash --delete-branch
```

### Promote to Staging (develop → release)

```bash
# Create PR from develop to release
gh pr create --base release --head develop --title "chore: promote to staging" --body "..."

# Merge commit (preserve history)
gh pr merge --merge
```

### Release to Production (release → main)

```bash
# Create PR from release to main
gh pr create --base main --head release --title "chore: release v1.0.0" --body "..."

# Merge commit (preserve history)
gh pr merge --merge

# Tag release
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### Hotfix (hotfix → main, then backport to develop)

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Fix and commit
git commit -m "fix: critical issue"

# 3. PR to main (merge commit)
git push -u origin hotfix/critical-fix
gh pr create --base main --title "fix: critical issue" --body "..."
gh pr merge --merge --delete-branch

# 4. Tag hotfix
git checkout main
git pull origin main
git tag -a v1.0.1 -m "Hotfix 1.0.1"
git push origin v1.0.1

# 5. Backport to develop via PR
gh pr create --base develop --head main --title "chore: backport hotfix v1.0.1" --body "..."
gh pr merge --merge
```

## Commit Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, refactor, docs, test, chore, perf, style, ci

**Example**:
```bash
git commit -m "feat(auth): add OAuth provider toggle API

Implement database-driven OAuth provider management.
Admin can enable/disable providers via API.

Closes #123"
```

## Environment Mapping

| Branch | Environment | Database | Deploy |
|--------|-------------|----------|--------|
| `develop` | Development | dev_girok_user | Auto |
| `release/*` | Staging | girok_user | Manual |
| `main` | Production | girok_user | Manual |
