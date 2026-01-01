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
- [Architecture Roadmap](ARCHITECTURE_ROADMAP.md) - System architecture overview

### Identity Platform Services (Phase 3)

- [Identity Service](services/IDENTITY_SERVICE.md) - Accounts, sessions, devices, profiles (Port 3000/50051)
- [Auth Service](services/AUTH_SERVICE.md) - RBAC, operators, sanctions (Port 3001/50052)
- [Legal Service](services/LEGAL_SERVICE.md) - Consents, documents, DSR (Port 3005/50053)

### Other Services

- [Personal Service](services/PERSONAL_SERVICE.md) - Resume management, file storage
- [Audit Service](services/AUDIT_SERVICE.md) - Compliance logging (ClickHouse, 5yr retention)
- [Analytics Service](services/ANALYTICS_SERVICE.md) - Business analytics (ClickHouse, MVs)

### Apps

- [Web Main](apps/WEB_MAIN.md) - Public React web application

### Packages

- [Types Package](packages/TYPES.md) - Shared TypeScript types
- [Nest Common](packages/nest-common.md) - NestJS shared utilities

### Infrastructure

- [ClickHouse](infrastructure/CLICKHOUSE.md) - Analytics database (MVs, schema, queries)

### Guides

- [gRPC Guide](guides/GRPC.md) - Inter-service gRPC communication
- [Resume Guide](guides/RESUME.md) - Resume feature documentation
- [SEO Guide](guides/SEO_GUIDE.md) - Search engine optimization
- [AdSense Guide](guides/ADSENSE_GUIDE.md) - Google AdSense integration

### Development

- [Core Rules](../.ai/rules.md) - Essential development rules
- [Database Guide](DATABASE.md) - Database management & migrations
- [Design System](DESIGN_SYSTEM.md) - WCAG 2.1 AAA design system
- [Internationalization](I18N.md) - i18n setup and usage
- [CI/CD](CI_CD.md) - Continuous integration & deployment

### Deployment

- [Kubernetes Deployment](policies/DEPLOYMENT.md) - K8s with ArgoCD
- [Docker Deployment](DOCKER_DEPLOYMENT.md) - Docker Compose setup
- [Performance Guide](policies/PERFORMANCE.md) - Optimization tips

### Policies

- [Security](policies/SECURITY.md) - Security best practices
- [Testing](policies/TESTING.md) - Testing standards
- [Caching](policies/CACHING.md) - Valkey/Redis caching strategy
- [Legal & Consent](policies/LEGAL_CONSENT.md) - GDPR, PIPA compliance
- [Global Account System](policies/GLOBAL_ACCOUNT.md) - Multi-service account architecture
- [LLM Guidelines](policies/LLM_GUIDELINES.md) - AI assistant guidelines

### Reports

- [Final Optimization Report](reports/FINAL_OPTIMIZATION_REPORT.md) - Caching opportunities summary
- [Optimization Report 2025](reports/OPTIMIZATION_REPORT_2025.md) - Full service analysis

### Global Account System

- [Global Account Policy](policies/GLOBAL_ACCOUNT.md) - Account modes, consent architecture
- [Operator Management](guides/OPERATOR_MANAGEMENT.md) - Create and manage operators
- [Account Linking](guides/ACCOUNT_LINKING.md) - Link SERVICE to UNIFIED mode
- [Consent Flow](guides/CONSENT_FLOW.md) - Country-specific consent handling

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
