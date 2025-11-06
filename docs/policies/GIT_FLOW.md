# Git Flow Workflow

> Based on Vincent Driessen's Git Flow model

## Branch Structure

```
main (production)
├── release/v1.0.0 (staging QA)
├── develop (development)
│   ├── feature/user-authentication
│   ├── feature/oauth-providers
│   └── feature/permission-system
└── hotfix/critical-bug-fix (emergency)
```

## Branches

### 1. Main Branches

#### main (or master)
- **Purpose**: Production-ready code
- **Environment**: Production
- **Deployment**: Automatic deployment to production
- **Protection**: Requires PR approval, all CI checks must pass
- **Lifetime**: Permanent

#### develop
- **Purpose**: Integration branch for features
- **Environment**: Development
- **Deployment**: Automatic deployment to dev environment
- **Protection**: Requires PR approval
- **Lifetime**: Permanent

### 2. Supporting Branches

#### feature/*
- **Purpose**: New feature development
- **Branch from**: develop
- **Merge back to**: develop
- **Naming**: `feature/user-authentication`, `feature/oauth-google`
- **Lifetime**: Until feature is complete
- **Example**:
  ```bash
  git checkout develop
  git checkout -b feature/user-authentication
  # Work on feature
  git push origin feature/user-authentication
  # Create PR to develop
  ```

#### release/*
- **Purpose**: Release preparation and QA
- **Branch from**: develop
- **Merge to**: main AND develop
- **Environment**: Staging
- **Naming**: `release/v1.0.0`, `release/v1.1.0`
- **Lifetime**: Until release is deployed
- **Example**:
  ```bash
  git checkout develop
  git checkout -b release/v1.0.0
  # Bug fixes only (no new features)
  git push origin release/v1.0.0
  # Deploy to staging for QA
  # After QA approval:
  git checkout main
  git merge release/v1.0.0
  git tag -a v1.0.0 -m "Release version 1.0.0"
  git checkout develop
  git merge release/v1.0.0
  ```

#### hotfix/*
- **Purpose**: Emergency production fixes
- **Branch from**: main
- **Merge to**: main AND develop
- **Naming**: `hotfix/critical-security-issue`
- **Lifetime**: Until fix is deployed
- **Example**:
  ```bash
  git checkout main
  git checkout -b hotfix/critical-security-issue
  # Fix the issue
  git push origin hotfix/critical-security-issue
  # Merge to main
  git checkout main
  git merge hotfix/critical-security-issue
  git tag -a v1.0.1 -m "Hotfix: critical security issue"
  # Merge to develop
  git checkout develop
  git merge hotfix/critical-security-issue
  ```

## Environment Mapping

| Branch | Environment | Database | Domain |
|--------|-------------|----------|--------|
| **develop** | Development | `dev_girok_user` | `localhost:3001` |
| **release/** | Staging | `girok_user` | `staging-api.beegy.net` |
| **main** | Production | `prod_girok_user` | `api.beegy.net` |

## Workflow

### New Feature Development

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/oauth-kakao

# 2. Develop feature with TDD
# - Write tests first (RED)
# - Implement feature (GREEN)
# - Refactor (REFACTOR)

# 3. Commit changes
git add .
git commit -m "feat(auth): add Kakao OAuth provider

Implement Kakao OAuth 2.0 authentication strategy.
Users can now login with their Kakao accounts.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push and create PR to develop
git push origin feature/oauth-kakao
# Create PR on GitHub: feature/oauth-kakao → develop

# 5. After PR approval, merge and delete branch
git checkout develop
git pull origin develop
git branch -d feature/oauth-kakao
```

### Release Process

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. Version bump and changelog
# - Update version in package.json
# - Update CHANGELOG.md

# 3. Deploy to staging for QA
git push origin release/v1.0.0
# Kubernetes deploys to staging environment

# 4. Bug fixes only (no new features)
git add .
git commit -m "fix(auth): resolve token expiration issue"

# 5. After QA approval, merge to main
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 6. Merge back to develop
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# 7. Delete release branch
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

### Hotfix Process

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/security-vulnerability

# 2. Fix the issue
git add .
git commit -m "fix(security): patch JWT token vulnerability"

# 3. Merge to main
git checkout main
git merge --no-ff hotfix/security-vulnerability
git tag -a v1.0.1 -m "Hotfix: security vulnerability"
git push origin main --tags

# 4. Merge to develop
git checkout develop
git merge --no-ff hotfix/security-vulnerability
git push origin develop

# 5. Delete hotfix branch
git branch -d hotfix/security-vulnerability
git push origin --delete hotfix/security-vulnerability
```

## Branch Protection Rules

### main
- Require pull request reviews (1 approval)
- Require status checks to pass:
  - CI tests
  - Linting
  - Build success
  - Coverage ≥ 80%
- No direct commits
- No force push
- Require signed commits (recommended)

### develop
- Require pull request reviews (1 approval)
- Require status checks to pass
- No force push

### feature/, release/, hotfix/
- No protection (developer freedom)
- But must pass CI before merging to protected branches

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance improvement

**Example:**
```
feat(auth): add Google OAuth provider

Implement Google OAuth 2.0 authentication strategy.
Users can now login with their Google accounts.

Closes #123

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## CI/CD Pipeline

### develop branch
```yaml
on push to develop:
  1. Run tests
  2. Run linter
  3. Build Docker image
  4. Deploy to development environment
  5. Run smoke tests
```

### release/* branch
```yaml
on push to release/*:
  1. Run tests
  2. Run linter
  3. Build Docker image
  4. Deploy to staging environment
  5. Run integration tests
  6. Run E2E tests
  7. Manual QA approval required
```

### main branch
```yaml
on merge to main:
  1. Run tests
  2. Build production Docker image
  3. Tag with version number
  4. Deploy to production (with approval)
  5. Run smoke tests
  6. Monitor metrics
```

## Version Numbering

Follow [Semantic Versioning (SemVer)](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes (v1.0.0 → v2.0.0)
- **MINOR**: New features (v1.0.0 → v1.1.0)
- **PATCH**: Bug fixes (v1.0.0 → v1.0.1)

## Best Practices

1. **Always branch from correct base**:
   - feature → develop
   - release → develop
   - hotfix → main

2. **Keep branches up to date**:
   ```bash
   git checkout feature/my-feature
   git merge develop  # Regularly sync with develop
   ```

3. **Small, focused commits**:
   - One feature/fix per branch
   - Clear, descriptive commit messages

4. **Test before merging**:
   - All tests must pass
   - Coverage must meet minimum (80%)

5. **Delete merged branches**:
   ```bash
   git branch -d feature/my-feature
   git push origin --delete feature/my-feature
   ```

6. **Use --no-ff for important merges**:
   ```bash
   git merge --no-ff release/v1.0.0  # Preserve branch history
   ```

## Troubleshooting

### Merge Conflicts
```bash
git checkout feature/my-feature
git merge develop  # Update with latest develop
# Resolve conflicts
git add .
git commit -m "merge: resolve conflicts with develop"
```

### Accidentally committed to wrong branch
```bash
git checkout correct-branch
git cherry-pick <commit-hash>
git checkout wrong-branch
git reset --hard HEAD~1
```

### Need to update release after QA
```bash
git checkout release/v1.0.0
# Make fixes
git commit -m "fix(release): address QA feedback"
# Continue release process
```

## Summary

**Git Flow Principles:**
- ✅ Two permanent branches: main (prod) + develop (dev)
- ✅ Three supporting branch types: feature, release, hotfix
- ✅ Never commit directly to main or develop
- ✅ Always use pull requests
- ✅ Merge release to both main AND develop
- ✅ Tag releases with version numbers
- ✅ Follow conventional commits
- ✅ Maintain 80%+ test coverage

**For questions, see:**
- [Original Git Flow article](https://nvie.com/posts/a-successful-git-branching-model/)
- [Atlassian Git Flow tutorial](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
