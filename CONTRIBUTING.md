# Contributing to My-Girok

Thank you for your interest in contributing to My-Girok! This document provides guidelines and workflows for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Git Flow Strategy](#git-flow-strategy)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Convention](#commit-message-convention)

## Code of Conduct

This project follows a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 22.11.0 LTS or higher
- pnpm 9.15.0 or higher
- PostgreSQL 16+
- Redis 7+ (optional for development)
- Docker and Docker Compose (for containerized development)

### Initial Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/my-girok.git
   cd my-girok
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**
   ```bash
   # Copy example environment files
   cp services/auth-service/.env.example services/auth-service/.env

   # Edit .env files with your local configuration
   ```

4. **Database Setup**
   ```bash
   # Using Docker Compose
   docker-compose up -d postgres redis

   # Or set up PostgreSQL manually and update DATABASE_URL in .env
   ```

5. **Run Database Migrations**
   ```bash
   cd services/auth-service
   pnpm prisma db push
   pnpm prisma generate
   ```

6. **Start Development Server**
   ```bash
   # Auth Service
   cd services/auth-service
   pnpm dev

   # Web Test App
   cd apps/web-main
   pnpm dev
   ```

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch from `develop` for your work:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write code following our [Coding Standards](#coding-standards)
- Write tests BEFORE implementation (TDD)
- Ensure all tests pass
- Update documentation if needed

### 3. Commit Your Changes

Follow our [Commit Message Convention](#commit-message-convention):

```bash
git add .
git commit -m "feat(auth): add OAuth provider toggle API"
```

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub targeting the `develop` branch.

## Git Flow Strategy

This project follows **Vincent Driessen's Git Flow** branching model.

### Branch Structure

```
main (production)
  └── release/* (staging/QA)
       └── develop (integration)
            └── feature/* (feature development)
            └── hotfix/* (emergency fixes)
```

### Branch Types

#### 1. `main` - Production Branch

- **Purpose**: Production-ready code
- **Environment**: Production servers
- **Merges from**: `release/*` branches only
- **Never commit directly**: Always merge through releases
- **Tagged**: Every merge to main gets a version tag (e.g., `v1.0.0`)

#### 2. `develop` - Integration Branch

- **Purpose**: Latest development changes
- **Environment**: Development servers
- **Merges from**: `feature/*`, `hotfix/*` branches
- **Never commit directly**: Always create feature branches
- **Base for**: All feature branches

#### 3. `feature/*` - Feature Branches

- **Purpose**: New features or enhancements
- **Naming**: `feature/description-of-feature`
- **Created from**: `develop`
- **Merged into**: `develop`
- **Deleted after**: Merge completes

**Examples**:
- `feature/google-oauth-integration`
- `feature/user-profile-api`
- `feature/admin-dashboard`

**Workflow**:
```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature

# Make changes, commit, push
git add .
git commit -m "feat: implement new feature"
git push origin feature/my-new-feature

# Create PR to develop
# After review and merge, delete branch
git checkout develop
git branch -d feature/my-new-feature
```

#### 4. `release/*` - Release Branches

- **Purpose**: Prepare for production release (QA/Staging)
- **Naming**: `release/v1.0.0`
- **Created from**: `develop`
- **Merged into**: Both `main` AND `develop`
- **Environment**: Staging servers
- **Only bug fixes allowed**: No new features

**Workflow**:
```bash
# Create release branch (by maintainers only)
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Deploy to staging, perform QA
# Fix bugs if found
git commit -m "fix: resolve staging bug"

# When ready for production:
# 1. Merge to main
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 2. Merge back to develop
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# 3. Delete release branch
git branch -d release/v1.0.0
```

#### 5. `hotfix/*` - Hotfix Branches

- **Purpose**: Emergency fixes for production
- **Naming**: `hotfix/critical-bug-description`
- **Created from**: `main`
- **Merged into**: Both `main` AND `develop`
- **Immediately deployed**: To production after testing

**Workflow**:
```bash
# Create hotfix (by maintainers only)
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Fix the issue
git commit -m "fix: resolve critical security vulnerability"

# Merge to main
git checkout main
git merge --no-ff hotfix/critical-security-fix
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# Merge to develop
git checkout develop
git merge --no-ff hotfix/critical-security-fix
git push origin develop

# Delete hotfix branch
git branch -d hotfix/critical-security-fix
```

### Environment Mapping

| Branch       | Environment | Database        | Purpose                    |
|--------------|-------------|-----------------|----------------------------|
| `develop`    | Development | dev_girok_user  | Active development         |
| `release/*`  | Staging     | girok_user      | QA testing before release  |
| `main`       | Production  | girok_user      | Live production code       |

## Coding Standards

### Language Policy

**ALL code, documentation, and commits MUST be in English**

- ✅ Code comments: English
- ✅ Variable names: English
- ✅ Commit messages: English
- ✅ Documentation: English
- ✅ API responses: English

### TypeScript Style

- Use **strict mode** (`"strict": true`)
- **No `any`** types - use proper typing
- Use **ES2023** features
- Prefer **async/await** over callbacks
- Use **functional programming** where appropriate

### Code Organization

```typescript
// ✅ Good
import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(dto: RegisterDto): Promise<User> {
    // Implementation
  }
}

// ❌ Bad
const AuthService = {
  register: function(email, password) {
    // No types, no dependency injection
  }
};
```

### Naming Conventions

- **Files**: kebab-case (`auth.service.ts`)
- **Classes**: PascalCase (`AuthService`)
- **Interfaces**: PascalCase with `I` prefix (`IAuthService`)
- **Functions**: camelCase (`validateUser`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`)
- **Environment variables**: UPPER_SNAKE_CASE (`DATABASE_URL`)

## Testing Requirements

### Test-Driven Development (TDD) is MANDATORY

All code MUST follow the TDD cycle:

```
RED → GREEN → REFACTOR
```

### Coverage Requirements

- **Minimum overall**: 80%
- **Critical paths** (auth, payments): 95%
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%

### Test Types

#### Unit Tests (70% of tests)

```typescript
describe('AuthService.register', () => {
  it('should hash password before saving', async () => {
    // Arrange
    const dto = { email: 'test@example.com', password: 'plain' };

    // Act
    const result = await service.register(dto);

    // Assert
    expect(result.password).not.toBe('plain');
    expect(await bcrypt.compare('plain', result.password)).toBe(true);
  });
});
```

#### Integration Tests (20% of tests)

```typescript
describe('AuthController Integration', () => {
  it('POST /api/v1/auth/register should create user', async () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'Test123!' })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });
});
```

#### E2E Tests (10% of tests)

```typescript
test('complete authentication flow', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[type="email"]', 'user@test.com');
  await page.fill('input[type="password"]', 'Pass123!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Logout')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## Pull Request Process

### Before Creating a PR

1. ✅ All tests pass (`pnpm test`)
2. ✅ Test coverage meets requirements (`pnpm test:cov`)
3. ✅ Code follows style guide
4. ✅ No console.log statements
5. ✅ Documentation updated
6. ✅ Commit messages follow convention

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tests pass locally
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: At least 1 approval required
3. **Merge**: Squash and merge to `develop`
4. **Cleanup**: Delete feature branch

## Commit Message Convention

We follow **Conventional Commits** specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `style`: Code style changes (formatting)
- `ci`: CI/CD changes

### Examples

```bash
# Feature
feat(auth): add OAuth provider toggle API

Implement database-driven OAuth provider enable/disable.
Prevents disabling LOCAL provider for security.

Closes #123

# Bug fix
fix(auth): resolve token refresh race condition

# Breaking change
feat(api)!: change authentication response format

BREAKING CHANGE: accessToken is now nested under 'tokens' object
```

### Rules

- Use imperative mood ("add" not "added")
- Don't capitalize first letter
- No period at the end
- Reference issues in footer
- Explain WHY, not what (what is in the code)

## Security

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Email security reports to: **security@example.com**

### Security Practices

- ✅ Never commit credentials
- ✅ Use environment variables
- ✅ Validate all inputs
- ✅ Use parameterized queries (Prisma)
- ✅ Hash passwords (bcrypt, 12 rounds)
- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Follow OWASP Top 10

## Questions?

- 📖 Read the [Documentation](./docs)
- 💬 Open a [Discussion](https://github.com/your-org/my-girok/discussions)
- 🐛 Report [Issues](https://github.com/your-org/my-girok/issues)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to My-Girok! 🎉
