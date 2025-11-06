# My-Girok

> Modern Authentication & User Management System with Multi-Provider OAuth

A production-ready authentication service built with TypeScript, NestJS, Prisma, and React. Features include local authentication, OAuth integration (Google, Kakao, Naver), role-based access control, and secure JWT token management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-22.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.7-blue.svg)
![NestJS](https://img.shields.io/badge/nestjs-10-red.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)

## ✨ Features

### Authentication & Authorization

- ✅ **Multi-Provider Authentication**
  - Local (Email + Password)
  - Google OAuth 2.0
  - Kakao OAuth
  - Naver OAuth
  - Apple OAuth (planned)

- ✅ **Security First**
  - JWT Access Tokens (15-minute expiration)
  - Refresh Tokens (7-day expiration)
  - Password hashing with bcrypt (12 rounds)
  - HTTPS-only in production
  - Rate limiting and CORS protection

- ✅ **Role-Based Access Control (RBAC)**
  - `GUEST` - View-only access
  - `USER` - Authenticated user
  - `MANAGER` - Moderator privileges
  - `MASTER` - Full administrative access

- ✅ **OAuth Provider Management**
  - Enable/disable OAuth providers via API
  - Database-driven configuration
  - Admin-only access with audit trail

### Web Test Application

- ✅ React 18 + Vite + TypeScript
- ✅ Automatic token refresh
- ✅ Protected routes
- ✅ Public and private pages
- ✅ Tailwind CSS styling

### API Documentation

- ✅ OpenAPI/Swagger documentation
- ✅ Interactive API testing
- ✅ JWT authentication support

### Testing

- ✅ Unit tests (Jest)
- ✅ Integration tests
- ✅ E2E tests (Playwright)
- ✅ 80%+ test coverage

## 🏗️ Tech Stack

### Backend

- **Runtime**: Node.js 22 LTS
- **Framework**: NestJS 10.4
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL 16 + Prisma 6
- **Cache**: Redis 7 (optional)
- **Authentication**: Passport.js + JWT

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite 6
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Router**: React Router 6

### Infrastructure

- **Monorepo**: pnpm 9 + Turborepo 2
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes + Helm 3
- **CI**: GitHub Actions
- **CD**: ArgoCD (GitOps)
- **Registry**: Harbor (harbor.girok.dev)
- **Deployment**: Docker Compose, Kubernetes

## 🚀 Quick Start

### Prerequisites

- Node.js 22.11.0 LTS or higher
- pnpm 9.15.0 or higher
- PostgreSQL 16+ (or use Docker Compose)
- Redis 7+ (optional)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/my-girok.git
cd my-girok
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up configuration files**

```bash
# Copy example files
cp docker-compose.yml.example docker-compose.yml
cp services/auth-service/.env.example services/auth-service/.env

# Edit with your configuration
nano docker-compose.yml
nano services/auth-service/.env
```

4. **Start with Docker Compose** (Recommended)

```bash
# Start all services (PostgreSQL, Redis, Auth API, Web App)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

5. **Or start manually**

```bash
# Terminal 1: Start auth service
cd services/auth-service
pnpm prisma db push
pnpm dev

# Terminal 2: Start web test app
cd apps/web-test
pnpm dev
```

6. **Access applications**

- Web App: http://localhost:3000
- Auth API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## 📖 Documentation

### User Documentation
- **[Contributing Guide](./CONTRIBUTING.md)** - Git Flow, coding standards, PR process
- **[CI/CD Pipeline](./docs/CI_CD.md)** - GitHub Actions, Harbor, ArgoCD
- **[Database Management](./docs/DATABASE.md)** - Migrations, backups, collaboration
- **[Docker Deployment](./docs/DOCKER_DEPLOYMENT.md)** - Complete Docker guide
- **[Helm Deployment - Auth Service](./services/auth-service/helm/README.md)** - Kubernetes deployment
- **[Helm Deployment - Web Test](./apps/web-test/helm/README.md)** - Web app deployment

### Developer Documentation
- **[Testing Guide](./.ai/testing.md)** - TDD, test coverage, best practices
- **[Architecture](./.ai/architecture.md)** - System architecture and patterns
- **[CI/CD Quick Reference](./.ai/ci-cd.md)** - Token-optimized CI/CD guide
- **[Database Quick Reference](./.ai/database.md)** - Token-optimized DB guide

## 🔧 Development

### Project Structure

```
my-girok/
├── apps/
│   └── web-test/              # React test application
│       ├── src/
│       ├── e2e/              # Playwright E2E tests
│       └── Dockerfile
├── services/
│   └── auth-service/          # Authentication service
│       ├── src/
│       │   ├── auth/         # Auth module (login, register, OAuth)
│       │   ├── users/        # User management
│       │   ├── oauth-config/ # OAuth provider configuration
│       │   ├── common/       # Shared utilities
│       │   └── database/     # Prisma client
│       ├── prisma/           # Database schema
│       ├── helm/             # Kubernetes Helm chart
│       └── Dockerfile
├── packages/
│   └── types/                 # Shared TypeScript types
│       └── src/
│           ├── auth/
│           └── user/
├── docs/                      # Documentation
├── .ai/                       # LLM-optimized docs
├── docker-compose.yml         # Docker orchestration
└── CONTRIBUTING.md            # Contribution guidelines
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                                    # Start all services
cd services/auth-service && pnpm dev        # Auth service only
cd apps/web-test && pnpm dev                # Web app only

# Database
cd services/auth-service
pnpm prisma studio                          # Database GUI
pnpm prisma db push                         # Sync schema
pnpm prisma migrate dev                     # Create migration

# Testing
pnpm test                                   # Run all tests
pnpm test:cov                               # Test coverage
cd apps/web-test && pnpm test:e2e          # E2E tests

# Build
pnpm build                                  # Build all packages
docker compose build                        # Build Docker images

# Lint
pnpm lint                                   # Lint code
pnpm format                                 # Format code
```

## 🌿 Git Flow

This project follows **Vincent Driessen's Git Flow** branching model:

```
main (production)
  └── release/* (staging/QA)
       └── develop (integration)
            └── feature/* (features)
            └── hotfix/* (emergency fixes)
```

### Branch Types

- **`main`** - Production-ready code
- **`develop`** - Latest development changes
- **`feature/*`** - New features (e.g., `feature/google-oauth`)
- **`release/*`** - Release preparation (e.g., `release/v1.0.0`)
- **`hotfix/*`** - Emergency production fixes

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed workflow.

## 🐳 Docker Deployment

### Quick Start

```bash
# 1. Copy example configuration
cp docker-compose.yml.example docker-compose.yml

# 2. Edit configuration (update secrets, domains, etc.)
nano docker-compose.yml

# 3. Start services
docker compose up -d

# 4. View logs
docker compose logs -f

# 5. Stop services
docker compose down
```

### Environment-Specific Configuration

Edit `docker-compose.yml` and set appropriate values for your environment:

- **Development**: Use local database, enable hot reload
- **Staging**: Production-like setup, test configuration
- **Production**: External database, strong secrets, resource limits

See [Docker Deployment Guide](./docs/DOCKER_DEPLOYMENT.md) for details.

## ☸️ Kubernetes Deployment

### Using Helm

```bash
# 1. Copy example values
cd services/auth-service/helm
cp values.yaml.example values.yaml

# 2. Edit values (update domains, secrets, resource limits)
nano values.yaml

# 3. Create Sealed Secrets (for production)
# See helm/README.md for detailed instructions

# 4. Install chart
helm install my-girok-auth . \
  -f values.yaml \
  --namespace my-girok \
  --create-namespace

# 5. Check status
helm status my-girok-auth -n my-girok
kubectl get pods -n my-girok
```

### Environment-Specific Values

You can create multiple values files for different environments:

```bash
# Create environment-specific values
cp values.yaml values-dev.yaml
cp values.yaml values-staging.yaml
cp values.yaml values-prod.yaml

# Install with specific environment
helm install my-girok-auth . -f values.yaml -f values-prod.yaml
```

See [Helm Chart README](./services/auth-service/helm/README.md) for details.

## 🧪 Testing

### Test-Driven Development (TDD)

This project follows strict TDD principles:

```
RED → GREEN → REFACTOR
```

### Coverage Requirements

- **Minimum overall**: 80%
- **Critical paths** (auth): 95%
- **Statements**: 80%
- **Branches**: 75%

### Running Tests

```bash
# Unit tests
cd services/auth-service
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
cd apps/web-test
pnpm test:e2e

# Coverage report
pnpm test:cov
```

## 🔒 Security

### Best Practices

- ✅ Never commit credentials
- ✅ Use environment variables
- ✅ Rotate JWT secrets every 90 days
- ✅ HTTPS-only in production
- ✅ Rate limiting enabled
- ✅ Input validation with class-validator
- ✅ Parameterized queries (Prisma)
- ✅ Password hashing (bcrypt, 12 rounds)

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Email: **security@example.com**

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for:

- Git Flow workflow
- Coding standards
- Testing requirements
- Pull request process
- Commit message convention

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch from `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```
3. Make your changes (write tests first!)
4. Ensure all tests pass
5. Commit using conventional commits
   ```bash
   git commit -m "feat(auth): add OAuth provider toggle"
   ```
6. Push and create a Pull Request to `develop`

## 📊 Project Status

### Completed ✅

- [x] Multi-provider authentication (Local, Google, Kakao, Naver)
- [x] JWT token management (Access + Refresh)
- [x] Role-based access control (RBAC)
- [x] OAuth provider management API
- [x] OpenAPI/Swagger documentation
- [x] React test web application
- [x] Docker Compose deployment
- [x] Kubernetes Helm chart
- [x] Unit tests (80%+ coverage)
- [x] Integration tests
- [x] E2E tests (Playwright)

### In Progress 🚧

- [ ] OAuth provider configuration UI
- [ ] User profile management
- [ ] Email verification
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)

### Planned 📋

- [ ] Admin dashboard (Next.js)
- [ ] Mobile apps (iOS, Android)
- [ ] Rate limiting per user
- [ ] Audit logging
- [ ] GraphQL API
- [ ] BFF layer (Backend for Frontend)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Frontend powered by [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Database management with [Prisma](https://www.prisma.io/)
- Containerization with [Docker](https://www.docker.com/)
- Orchestration with [Kubernetes](https://kubernetes.io/)

## 📞 Support

- 📖 Documentation: See `docs/` and `.ai/` directories
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/my-girok/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/my-girok/discussions)

---

**Built with ❤️ for secure authentication and user management**
