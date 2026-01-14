# 2026-01-14: Database Documentation Update

**Type**: Documentation
**Scope**: Database migrations, environment-specific DB names
**Files**: docs/llm/guides/db-migration.md, docs/llm/policies/database.md

## Changes

1. **Created comprehensive migration guide** (`docs/llm/guides/db-migration.md`)
   - ArgoCD PreSync pattern with sync-wave ordering
   - PostgreSQL and ClickHouse migration job templates
   - Environment-specific database names (dev/release/prod)
   - ConfigService pattern for dynamic DB names
   - Troubleshooting common errors

2. **Updated database policy** (`docs/llm/policies/database.md`)
   - Added authorization-service to database list
   - Documented environment-specific database names
   - Updated ClickHouse database naming convention

3. **Updated .ai/database.md**
   - Added database service table
   - Referenced new SSOT docs

## Rationale

Recent work (commit e3e9dda) fixed hardcoded database names across 5 services:

- analytics-service: 4 files (session, ingestion, behavior, funnel)
- audit-service: 1 file (session-recording)

This documentation update ensures future developers:

- Understand environment-specific DB naming
- Use ConfigService pattern for dynamic DB names
- Follow ArgoCD PreSync migration pattern
- Avoid hardcoding database names

## Related Commits

- my-girok: e3e9dda (fix: resolve all deployment blockers)
- platform-gitops: a354287b (feat: enable migration job for authorization-service)
