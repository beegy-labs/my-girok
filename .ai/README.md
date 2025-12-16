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
- **[architecture.md](architecture.md)** - Architecture patterns

### Development & Deployment
- **[project-setup.md](project-setup.md)** - Quick project setup guide
- **[git-flow.md](git-flow.md)** - Git Flow workflow reference
- **[ci-cd.md](ci-cd.md)** - CI/CD pipeline (GitHub Actions + ArgoCD)
- **[database.md](database.md)** - Database migrations and management
- **[testing.md](testing.md)** - TDD guidelines and testing patterns

### Backend Services
- **[services/auth-service.md](services/auth-service.md)** - Authentication & authorization API
- **[services/personal-service.md](services/personal-service.md)** - Resume, Share, User Preferences

### Frontend Apps
- **[apps/web-main.md](apps/web-main.md)** - Main web application (React + Vite)

### Shared Packages
- **[packages/nest-common.md](packages/nest-common.md)** - Shared NestJS utilities (guards, decorators, health)

## Task-Based Navigation

**"I need to add authentication..."**
→ Read: `rules.md` + `architecture.md` + `services/auth-service.md`

**"I need to work on resume features..."**
→ Read: `rules.md` + `services/personal-service.md`

**"I need to update the web frontend..."**
→ Read: `rules.md` + `apps/web-main.md`

**"I need to set up the project..."**
→ Read: `project-setup.md`

**"I need to understand Git workflow..."**
→ Read: `git-flow.md`

**"I need to setup CI/CD..."**
→ Read: `ci-cd.md`

**"I need to manage database migrations..."**
→ Read: `database.md`

**"I need to create a new NestJS service..."**
→ Read: `rules.md` + `packages/nest-common.md`

## File Format

Each service/app file contains:
1. **Purpose** - What this service does
2. **Tech Stack** - Technologies used
3. **API Endpoints** - Key routes and methods
4. **Key Flows** - Important business logic flows
5. **Integration** - How it connects to other services

Keep it concise, pattern-focused, and example-driven.
