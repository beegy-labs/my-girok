# AI Assistant Navigation

> **Purpose**: This directory contains LLM-optimized documentation for AI assistants working on my-girok project.

## How to Use This Directory

**When starting a new task:**
1. Read `rules.md` for core development rules
2. Read `architecture.md` for system patterns
3. Read specific service/app file based on your task

## Quick Links

### Core Documentation
- **[rules.md](rules.md)** - Essential DO/DON'T rules (READ FIRST)
- **[architecture.md](architecture.md)** - Architecture patterns and routing

### Development & Deployment
- **[project-setup.md](project-setup.md)** - Quick project setup guide
- **[git-flow.md](git-flow.md)** - Git Flow workflow reference
- **[ci-cd.md](ci-cd.md)** - CI/CD pipeline (GitHub Actions + ArgoCD)
- **[database.md](database.md)** - Database migrations and management
- **[docker-deployment.md](docker-deployment.md)** - Docker Compose quick reference
- **[helm-deployment.md](helm-deployment.md)** - Kubernetes/Helm quick reference
- **[testing.md](testing.md)** - TDD guidelines and testing patterns

### Backend Services
- **[services/auth-service.md](services/auth-service.md)** - Authentication & authorization API
- **[services/content-api.md](services/content-api.md)** - Posts, notes, files API
- **[services/web-bff.md](services/web-bff.md)** - Web Backend-for-Frontend
- **[services/mobile-bff.md](services/mobile-bff.md)** - Mobile Backend-for-Frontend
- **[services/api-gateway.md](services/api-gateway.md)** - Optional API Gateway
- **[services/llm-api.md](services/llm-api.md)** - AI/LLM service (Python)

### Frontend Apps
- **[apps/web-main.md](apps/web-main.md)** - Main web application (React + Vite)
- **[apps/web-admin.md](apps/web-admin.md)** - Admin dashboard (Next.js)
- **[apps/mobile-flutter.md](apps/mobile-flutter.md)** - Mobile app (Flutter - iOS & Android)

### Shared Packages
- **[packages/nest-common.md](packages/nest-common.md)** - Shared NestJS utilities (guards, decorators, health)

## Task-Based Navigation

**"I need to add authentication..."**
→ Read: `rules.md` + `architecture.md` + `services/auth-service.md`

**"I need to create a new API endpoint..."**
→ Read: `rules.md` + specific service file (auth-service or content-api)

**"I need to add a new BFF endpoint..."**
→ Read: `rules.md` + `architecture.md` + `services/web-bff.md` or `services/mobile-bff.md`

**"I need to update the web frontend..."**
→ Read: `rules.md` + `apps/web-main.md`

**"I need to work on mobile app..."**
→ Read: `rules.md` + `apps/mobile-flutter.md`

**"I need to set up the project..."**
→ Read: `project-setup.md`

**"I need to deploy with Docker..."**
→ Read: `docker-deployment.md`

**"I need to deploy to Kubernetes..."**
→ Read: `helm-deployment.md`

**"I need to understand Git workflow..."**
→ Read: `git-flow.md`

**"I need to setup CI/CD..."**
→ Read: `ci-cd.md`

**"I need to manage database migrations..."**
→ Read: `database.md`

**"I need testing/security/performance info..."**
→ Read: `testing.md` or refer to `docs/policies/` for detailed documentation

**"I need to create a new NestJS service..."**
→ Read: `rules.md` + `packages/nest-common.md`

**"I need to understand shared utilities..."**
→ Read: `packages/nest-common.md`

## Token Optimization

- **This directory (.ai/)**: ~10K tokens (patterns, APIs, flows)
- **Full docs (docs/)**: ~73K tokens (detailed policies, tutorials)

**Read .ai/ for coding tasks, refer to docs/ for learning/policies.**

## File Format

Each service/app file contains:
1. **Purpose** - What this service does
2. **Tech Stack** - Technologies used
3. **API Endpoints** - Key routes and methods
4. **Key Flows** - Important business logic flows
5. **Integration** - How it connects to other services

Keep it concise, pattern-focused, and example-driven.
