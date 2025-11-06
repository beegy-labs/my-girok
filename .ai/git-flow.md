# Git Flow Quick Reference

## Branch Structure

```
main (production)
  └── release/* (staging/QA)
       └── develop (integration)
            └── feature/* (features)
            └── hotfix/* (emergency)
```

## Branch Types

| Branch | Purpose | Created From | Merged Into | Environment |
|--------|---------|--------------|-------------|-------------|
| `main` | Production | - | - | Production |
| `develop` | Integration | `main` | - | Development |
| `feature/*` | New features | `develop` | `develop` | - |
| `release/*` | Release prep | `develop` | `main` + `develop` | Staging |
| `hotfix/*` | Emergency fix | `main` | `main` + `develop` | - |

## Common Workflows

### Feature Development

```bash
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# Work, commit
git add .
git commit -m "feat(scope): description"

# Create PR to develop
git push origin feature/new-feature
```

### Release

```bash
# Create release branch (maintainers only)
git checkout develop
git checkout -b release/v1.0.0

# Deploy to staging, test, fix bugs
git commit -m "fix: staging bug"

# Merge to main
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"

# Merge back to develop
git checkout develop
git merge --no-ff release/v1.0.0

# Delete release branch
git branch -d release/v1.0.0
```

### Hotfix

```bash
# Create hotfix (maintainers only)
git checkout main
git checkout -b hotfix/critical-fix

# Fix, commit
git commit -m "fix: critical issue"

# Merge to main
git checkout main
git merge --no-ff hotfix/critical-fix
git tag -a v1.0.1 -m "Hotfix 1.0.1"

# Merge to develop
git checkout develop
git merge --no-ff hotfix/critical-fix

# Delete hotfix branch
git branch -d hotfix/critical-fix
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
