# Git Workflow Policy

> GitFlow branching strategy and conventions | **Last Updated**: 2026-01-06

## Overview

This project follows the **GitFlow** branching model with GitHub-specific merge strategies optimized for CI/CD and code review.

## Branch Structure

```
main (Production)
├── release (Staging)
│   └── develop (Development)
│       └── feat/* (Feature branches)
│       └── fix/* (Bug fix branches)
│       └── refactor/* (Refactoring branches)
```

### Branch Purposes

| Branch    | Purpose                | Environment | Protection   |
| --------- | ---------------------- | ----------- | ------------ |
| `main`    | Production-ready code  | Production  | Required PRs |
| `release` | Staging/pre-production | Staging     | Required PRs |
| `develop` | Integration branch     | Development | Required PRs |
| `feat/*`  | New features           | Local       | None         |
| `fix/*`   | Bug fixes              | Local       | None         |

## Merge Strategy

### Why Different Strategies?

| Flow              | Strategy   | Reason                                         |
| ----------------- | ---------- | ---------------------------------------------- |
| feat → develop    | **Squash** | Clean history, single commit per feature       |
| develop → release | **Merge**  | Preserve commit history for staging validation |
| release → main    | **Merge**  | Full audit trail for production releases       |

### Commands

```bash
# Feature to develop (squash)
gh pr merge --squash --delete-branch

# Develop to release (merge)
gh pr merge --merge

# Release to main (merge)
gh pr merge --merge
```

## Feature Development Workflow

### 1. Start Feature

```bash
# Ensure you're on latest develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feat/user-authentication
```

### 2. Develop Feature

```bash
# Make atomic commits
git commit -m "feat(auth): add login form component"
git commit -m "feat(auth): implement JWT token handling"
git commit -m "test(auth): add unit tests for login flow"
```

### 3. Push and Create PR

```bash
git push -u origin feat/user-authentication
gh pr create --base develop --title "feat(auth): implement user authentication"
```

### 4. Merge After Review

```bash
gh pr merge --squash --delete-branch
```

## Commit Convention

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type       | Description                           |
| ---------- | ------------------------------------- |
| `feat`     | New feature                           |
| `fix`      | Bug fix                               |
| `refactor` | Code refactoring (no behavior change) |
| `docs`     | Documentation changes                 |
| `test`     | Adding or updating tests              |
| `chore`    | Maintenance tasks (deps, configs)     |
| `perf`     | Performance improvements              |
| `style`    | Code style changes (formatting, etc.) |
| `ci`       | CI/CD configuration changes           |

### Scope Examples

| Scope           | Usage                   |
| --------------- | ----------------------- |
| `auth`          | Authentication features |
| `identity`      | Identity service        |
| `web-main`      | Main web application    |
| `ui-components` | UI component library    |
| `design-tokens` | Design token package    |
| `ci`            | CI/CD workflows         |
| `deps`          | Dependency updates      |

### Examples

```bash
# Feature
feat(auth): implement OAuth2 login flow

# Bug fix
fix(identity): resolve session expiry race condition

# Refactoring
refactor(personal-service): extract resume validation logic

# Documentation
docs(api): add OpenAPI specs for identity endpoints

# Test
test(auth): add integration tests for token refresh
```

## Release Process

### 1. Promote to Staging

```bash
# Create PR from develop to release
gh pr create --base release --head develop \
  --title "release: v1.2.0 staging promotion"

# After approval
gh pr merge --merge
```

### 2. Deploy to Production

```bash
# Create PR from release to main
gh pr create --base main --head release \
  --title "release: v1.2.0 production deployment"

# After approval
gh pr merge --merge

# Tag the release
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

## Hotfix Process

For critical production bugs:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-security-fix

# Fix and commit
git commit -m "fix(security): patch XSS vulnerability"

# Create PR to main
gh pr create --base main --title "hotfix: critical security patch"

# After merge, backport to release and develop
git checkout release
git cherry-pick <commit-hash>
git push origin release

git checkout develop
git cherry-pick <commit-hash>
git push origin develop
```

## Branch Protection Rules

### All Protected Branches

- Require pull request reviews
- Require status checks to pass
- Require linear history (squash merges for features)
- Restrict force pushes

### Production (main)

- Require 2 approvals
- Require signed commits
- Require deployment approval

## Best Practices

### DO

- Keep feature branches short-lived (< 1 week)
- Write descriptive commit messages
- Rebase feature branches on develop before PR
- Delete branches after merge
- Use conventional commits

### DON'T

- Commit directly to protected branches
- Force push to shared branches
- Create overly large PRs (> 500 lines)
- Mix unrelated changes in one commit
- Skip code review

## Related Documentation

- **Quick Reference**: `.ai/git-flow.md`
- **PR Guidelines**: `.ai/pull-requests.md`
- **CI/CD**: `docs/en/CI_CD.md`
