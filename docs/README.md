# Documentation Index

> Comprehensive documentation for my-girok project

## Documentation Structure

This directory contains detailed policies, guides, and API specifications for human developers.

**For AI assistants**: Use `.ai/` directory for implementation guidance (optimized for token efficiency)

## Policies

### [SECURITY.md](policies/SECURITY.md)

Complete security policies and best practices:

- Input validation & sanitization
- API security (rate limiting, CORS, versioning)
- Secrets management (Sealed Secrets, External Secrets)
- Authentication security (JWT, token storage)
- Security headers
- Error handling & logging
- Security checklist

### [TESTING.md](policies/TESTING.md)

Testing standards and requirements:

- Coverage requirements (80% minimum)
- Testing strategies (unit, integration, E2E)
- Test database setup
- CI/CD requirements
- GitHub Actions workflows
- Branch protection rules
- Common testing patterns

### [PERFORMANCE.md](policies/PERFORMANCE.md)

Performance optimization guidelines:

- Performance budgets (API response times, frontend metrics)
- Database optimization (indexing, query optimization, connection pooling)
- Caching strategy (Redis, cache-aside pattern)
- Frontend optimization (Next.js, code splitting)
- Monitoring & observability
- Mobile performance (iOS, Android)
- Performance checklist

### [DEPLOYMENT.md](policies/DEPLOYMENT.md)

Kubernetes deployment guide:

- Deployment environments (local, staging, production)
- Kubernetes structure (namespaces, resources)
- Secrets management (Sealed Secrets, External Secrets Operator)
- Deployment examples (services, StatefulSets, HPA, Ingress)
- Kustomize usage
- CI/CD pipelines (GitHub Actions)
- Database management & migrations
- Monitoring & logging
- Troubleshooting guide

## Quick Links

### Getting Started

- [Main README](../README.md) - Project overview
- [Architecture](.ai/architecture.md) - System architecture patterns

### Features

- [Resume Guide](guides/RESUME.md) - Resume feature documentation

### Development

- [Core Rules](../.ai/rules.md) - Essential development rules
- [Security Policies](policies/SECURITY.md) - Security best practices
- [Testing Standards](policies/TESTING.md) - How to test your code

### Deployment

- [Deployment Guide](policies/DEPLOYMENT.md) - Kubernetes deployment
- [Performance Guide](policies/PERFORMANCE.md) - Optimization tips

## For AI Assistants

**Prefer `.ai/` directory for implementation tasks:**

- `.ai/rules.md` - Core DO/DON'T rules (~3K tokens)
- `.ai/architecture.md` - Architecture patterns (~4K tokens)
- `.ai/services/*` - Service-specific APIs and flows (~2K tokens each)
- `.ai/apps/*` - App-specific implementation guides (~2K tokens each)

**Use `docs/policies/` for detailed policies:**

- When you need security requirements
- When you need testing standards
- When you need performance targets
- When you need deployment procedures

## Contributing

When adding new documentation:

1. **AI Documentation** (`.ai/`):
   - Keep it concise (pattern-focused)
   - Include code examples
   - Focus on APIs and flows
   - Target: <2K tokens per file

2. **Human Documentation** (`docs/`):
   - Detailed explanations
   - Step-by-step tutorials
   - Comprehensive checklists
   - Background information

## Documentation Principles

### AI Documentation (.ai/)

- **Purpose**: Help LLMs implement features quickly
- **Format**: Patterns, APIs, code examples
- **Length**: Concise (~10K tokens total)
- **Audience**: AI assistants (Claude, GPT, etc.)

### Human Documentation (docs/)

- **Purpose**: Help developers learn and reference
- **Format**: Tutorials, policies, detailed guides
- **Length**: Comprehensive (~73K tokens total)
- **Audience**: Human developers

---

**Questions?** See [CLAUDE.md](../CLAUDE.md) for AI assistant entry point or [README.md](../README.md) for project overview.
