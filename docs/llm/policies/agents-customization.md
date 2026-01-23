# AGENTS.md Customization Guide

> How to add project-specific content to AGENTS.md | **Last Updated**: 2026-01-23

## Overview

Each project's `AGENTS.md` consists of two parts:

1. **Standard Section**: Synced from `llm-dev-protocol` (read-only for projects)
2. **Custom Section**: Project-specific additions (editable by project)

## File Structure

```markdown
# AGENTS.md

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- BEGIN: STANDARD POLICY (Auto-synced from llm-dev-protocol)         -->
<!-- DO NOT EDIT this section manually - changes will be overwritten    -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

> **Multi-LLM Standard Policy** | **Version**: 1.0.0

... standard content from llm-dev-protocol ...

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- END: STANDARD POLICY                                               -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

---

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- BEGIN: PROJECT CUSTOM (Safe to edit)                               -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

## Project-Specific Configuration

### Architecture & Stack

| Layer         | Tech                                                   |
| ------------- | ------------------------------------------------------ |
| **Frontend**  | React 19.2, TypeScript 5.9, Tailwind CSS 4.1, Vite 7.3 |
| **Backend**   | Node.js 24, NestJS 11.1, GraphQL Federation, gRPC      |
| **Database**  | PostgreSQL 16, Prisma 7, Valkey                        |
| **Messaging** | Redpanda (Kafka-compatible)                            |
| **Deploy**    | Kubernetes, Kustomize, Cilium Gateway API              |

### Project-Specific Rules

| Rule                 | Description                                      |
| -------------------- | ------------------------------------------------ |
| Test Coverage        | 80% minimum                                      |
| Types First          | Define in `packages/types` before implementation |
| Transaction Required | Use `@Transactional()` for multi-step DB ops     |
| BFF Pattern          | All client auth goes through BFF                 |

### Domain-Specific Guidelines

#### E-commerce Rules

- All prices MUST be stored in cents (integer)
- Currency code MUST be ISO 4217
- Inventory updates MUST use optimistic locking

#### Healthcare Compliance

- PHI data MUST be encrypted at rest
- Audit logs MUST be immutable
- Access logs MUST be retained for 7 years

### Integration Points

| External System | Auth Method | Rate Limit | Contact      |
| --------------- | ----------- | ---------- | ------------ |
| Payment Gateway | API Key     | 100/min    | team@pay.com |
| Email Service   | OAuth 2.0   | 1000/hr    | api@mail.com |
| Analytics       | JWT         | Unlimited  | Internal     |

### On-Call Procedures

| Incident Type   | Severity | Response Time | Escalation          |
| --------------- | -------- | ------------- | ------------------- |
| Production Down | P0       | 5 minutes     | CTO immediately     |
| Data Loss       | P0       | 5 minutes     | CTO + Legal         |
| Security Breach | P0       | 5 minutes     | CTO + Security Team |
| API Degradation | P1       | 15 minutes    | Engineering Lead    |

<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
<!-- END: PROJECT CUSTOM                                                -->
<!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
```

## Markers

### Standard Section Markers

```markdown
<!-- BEGIN: STANDARD POLICY (Auto-synced from llm-dev-protocol) -->

... content ...

<!-- END: STANDARD POLICY -->
```

**Rules**:

- Content between these markers is **automatically overwritten** during sync
- DO NOT edit this section in project repositories
- Changes MUST be made in `llm-dev-protocol/AGENTS.md` and synced

### Custom Section Markers

```markdown
<!-- BEGIN: PROJECT CUSTOM (Safe to edit) -->

... content ...

<!-- END: PROJECT CUSTOM -->
```

**Rules**:

- Content between these markers is **preserved** during sync
- Safe to edit in project repositories
- Add any project-specific configurations here

## What to Put in Custom Section

### Recommended Content

| Category         | Examples                                            |
| ---------------- | --------------------------------------------------- |
| **Tech Stack**   | Specific versions, frameworks, libraries used       |
| **Domain Rules** | Business logic constraints, validation rules        |
| **Integration**  | External APIs, authentication methods, rate limits  |
| **Compliance**   | Industry regulations (HIPAA, GDPR, PCI-DSS)         |
| **On-Call**      | Incident response procedures, escalation paths      |
| **Performance**  | SLA targets, latency requirements, throughput       |
| **Security**     | Auth schemes, encryption standards, access controls |

### Examples by Domain

#### SaaS Product

```markdown
## Project-Specific Configuration

### Subscription Tiers

| Tier       | Max Users | Storage | API Calls/day |
| ---------- | --------- | ------- | ------------- |
| Free       | 5         | 1GB     | 1,000         |
| Pro        | 50        | 100GB   | 100,000       |
| Enterprise | Unlimited | 1TB     | Unlimited     |

### Feature Flags

| Flag               | Default | Production | Description            |
| ------------------ | ------- | ---------- | ---------------------- |
| new_dashboard      | false   | false      | Next-gen dashboard UI  |
| advanced_analytics | false   | true       | Pro+ only analytics    |
| ai_suggestions     | false   | false      | AI-powered suggestions |
```

#### Financial Services

```markdown
## Project-Specific Configuration

### Regulatory Compliance

| Regulation | Applies To     | Requirements                         |
| ---------- | -------------- | ------------------------------------ |
| PCI-DSS    | Payment data   | Encryption, tokenization, audit logs |
| SOX        | Financial data | Immutable logs, access controls      |
| AML        | Transactions   | Transaction monitoring, reporting    |

### Transaction Limits

| Type          | Daily Limit | Single Tx Limit | Verification Required |
| ------------- | ----------- | --------------- | --------------------- |
| Bank Transfer | $50,000     | $10,000         | 2FA + Email           |
| Credit Card   | $5,000      | $1,000          | CVV                   |
| Wire Transfer | $100,000    | $50,000         | KYC + Manual Review   |
```

#### Healthcare

```markdown
## Project-Specific Configuration

### HIPAA Compliance

| Requirement         | Implementation                             |
| ------------------- | ------------------------------------------ |
| PHI Encryption      | AES-256 at rest, TLS 1.3 in transit        |
| Access Logs         | All PHI access logged to immutable storage |
| Minimum Necessary   | Role-based data filtering                  |
| Breach Notification | Auto-alert within 60 days                  |

### Patient Data Classification

| Level     | Examples                   | Retention  | Encryption |
| --------- | -------------------------- | ---------- | ---------- |
| Critical  | SSN, Medical Record        | 7 years    | Required   |
| Sensitive | Contact info, Appointments | 3 years    | Required   |
| Public    | Educational content        | Indefinite | Optional   |
```

## Sync Behavior

### Automatic Sync (CI/CD)

When `llm-dev-protocol/AGENTS.md` changes:

1. **Read project's AGENTS.md**: Extract custom section
2. **Replace standard section**: Update with new standard from llm-dev-protocol
3. **Preserve custom section**: Keep project-specific content intact
4. **Write merged file**: Save to project's AGENTS.md

### Manual Sync

```bash
# From llm-dev-protocol
./scripts/sync-standards.sh

# Dry run to preview changes
./scripts/sync-standards.sh --dry-run
```

## Migration Guide

### Converting Existing AGENTS.md

If you have an existing `AGENTS.md` without markers:

```bash
# Run migration script
./scripts/migrate-agents-md.sh /path/to/project

# This will:
# 1. Backup existing AGENTS.md
# 2. Extract custom content (heuristic-based)
# 3. Add standard section with markers
# 4. Add custom section with markers
# 5. Merge and save
```

### Manual Migration

1. **Backup**: `cp AGENTS.md AGENTS.md.backup`

2. **Identify custom content**: Find sections unique to your project

3. **Restructure**:

   ```markdown
   <!-- BEGIN: STANDARD POLICY -->

   ... copy from llm-dev-protocol/AGENTS.md ...

   <!-- END: STANDARD POLICY -->

   ---

   <!-- BEGIN: PROJECT CUSTOM -->

   ... your custom sections ...

   <!-- END: PROJECT CUSTOM -->
   ```

4. **Validate**: Run `./scripts/validate-structure.sh /path/to/project`

## Best Practices

| Practice            | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| **Standard First**  | Follow standard policy, add customizations only when necessary   |
| **Document Why**    | Explain why custom rules exist (regulatory, business, technical) |
| **Keep Current**    | Review custom section quarterly, remove outdated rules           |
| **Table Format**    | Use tables for structured data (easier for LLM parsing)          |
| **Cross-Reference** | Link to detailed docs in `.ai/` or `docs/llm/` when needed       |

## Validation

The validation script checks:

```bash
./scripts/validate-structure.sh /path/to/project

# Checks:
# ✓ STANDARD POLICY markers present
# ✓ PROJECT CUSTOM markers present
# ✓ Standard section matches llm-dev-protocol version
# ✓ No edits in standard section
# ⚠ Large custom section (>200 lines) - consider moving to docs/llm/
```

## Anti-Patterns

### ❌ Don't

```markdown
<!-- BEGIN: PROJECT CUSTOM -->

## Complete Tech Stack Documentation

... 500 lines of detailed tech docs ...

<!-- END: PROJECT CUSTOM -->
```

**Problem**: Custom section too large, harder for LLM to parse

**Solution**: Move to `docs/llm/architecture.md`, add summary table in custom section

### ❌ Don't

```markdown
<!-- BEGIN: PROJECT CUSTOM -->

We use React. Also we have some API endpoints.

<!-- END: PROJECT CUSTOM -->
```

**Problem**: Unstructured text, low information density

**Solution**: Use tables and structured formats

### ✅ Do

```markdown
<!-- BEGIN: PROJECT CUSTOM -->

## Architecture & Stack

| Layer    | Tech               | Version | Notes                |
| -------- | ------------------ | ------- | -------------------- |
| Frontend | React              | 19.2    | See `.ai/apps/`      |
| API      | GraphQL Federation | 2.9     | Gateway at port 4000 |

**Full Documentation**: `docs/llm/architecture.md`

<!-- END: PROJECT CUSTOM -->
```

## Version Control

### Git Conflicts

If sync causes merge conflicts in AGENTS.md:

```bash
# 1. Accept incoming standard section (from llm-dev-protocol)
git checkout --theirs AGENTS.md

# 2. Restore your custom section
git show HEAD:AGENTS.md | sed -n '/BEGIN: PROJECT CUSTOM/,/END: PROJECT CUSTOM/p' > custom.tmp

# 3. Replace custom section
# (Automated by sync script, or manually edit)

# 4. Verify
./scripts/validate-structure.sh .
```

### Standard Version Tracking

Custom section can reference standard version:

```markdown
<!-- BEGIN: PROJECT CUSTOM -->

> **Based on Standard Version**: 1.0.0 | **Last Project Update**: 2026-01-23

## Project-Specific Configuration

...

<!-- END: PROJECT CUSTOM -->
```

---

**Related**:

- Standard Policy: `llm-dev-protocol/AGENTS.md`
- Sync Script: `llm-dev-protocol/scripts/sync-standards.sh`
- Migration Script: `llm-dev-protocol/scripts/migrate-agents-md.sh`
