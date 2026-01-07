# Service Optimization Report 2025

> Generated: 2025-12-28 | Branch: feat/global-account-system

## Executive Summary

This report provides a comprehensive analysis of all services for:

- **UUIDv7 Compliance**: 5 non-compliant files found
- **SQL Injection Risks**: 2 medium-risk patterns (mitigated), all others safe
- **Query Optimization**: 25+ optimization opportunities identified
- **Caching Strategy**: Cache-aside pattern with Valkey recommended

---

## 1. 2025 Best Practices Reference

### Core Principles (KISS + YAGNI)

| Principle | Description              | Application                                        |
| --------- | ------------------------ | -------------------------------------------------- |
| **KISS**  | Keep It Simple, Stupid   | Avoid complex abstractions for one-time operations |
| **YAGNI** | You Aren't Gonna Need It | Only implement features when actually needed       |
| **DRY**   | Don't Repeat Yourself    | Extract only when pattern appears 3+ times         |

### Caching Strategy: Cache-Aside Pattern

```
Request → Check Valkey → Hit? → Return cached data
                       ↓
                      Miss → Query DB → Store in Valkey → Return data
```

**2025 Implementation**:

- Use `@nestjs/cache-manager` with `cache-manager-ioredis-yet`
- Valkey (Redis fork): 40% memory reduction, 230% scaling improvement vs Redis
- TTL strategy: 5-15 min for permissions, 1 hour for static config

---

## 2. UUIDv7 Compliance Audit

### Non-Compliant Files (5 files)

| File                                            | Line               | Issue                                        | Fix Required                   |
| ----------------------------------------------- | ------------------ | -------------------------------------------- | ------------------------------ |
| personal-service/src/storage/storage.service.ts | 4                  | `import { v4 as uuid } from 'uuid'`          | Use `ID.generate()`            |
| personal-service/src/storage/storage.service.ts | 135, 175, 264, 337 | `uuid()` calls                               | Replace with `ID.generate()`   |
| auth-service/prisma/schema.prisma               | 23 locations       | `@default(dbgenerated("gen_random_uuid()"))` | Application-side ID generation |
| personal-service/prisma/schema.prisma           | 13 locations       | `@default(dbgenerated("gen_random_uuid()"))` | Application-side ID generation |
| SQL Migrations                                  | 27+ locations      | `DEFAULT gen_random_uuid()`                  | Historical - acceptable        |

### Priority Actions

1. **HIGH**: Fix `storage.service.ts` (4 uuid() calls)
2. **MEDIUM**: Schema defaults (acceptable for now - IDs generated in app layer)
3. **LOW**: Historical migrations (no action needed)

---

## 3. SQL Injection Vulnerability Audit

### Summary

| Risk Level | Count | Status                    |
| ---------- | ----- | ------------------------- |
| HIGH       | 0     | N/A                       |
| MEDIUM     | 2     | Mitigated with validation |
| LOW        | 4     | Safe (parameterized)      |

### Medium-Risk Patterns (Mitigated)

Both medium-risk patterns have comprehensive validation:

- UUID regex validation
- Table name whitelists
- Partition format validation

---

## 4. Service Optimization Analysis

### 4.1 Auth-Service

**Duplicate DB Calls (3 major issues)**:

- Permission fetch with wildcard count check
- Service lookup duplicated 6x
- Personal info existence + refetch

**Cache Candidates**:

| Data                  | TTL      | DB Load Reduction |
| --------------------- | -------- | ----------------- |
| Role Permissions      | 5-15 min | 70-80%            |
| Service Config        | 1 hour   | 50-70%            |
| Legal Documents       | 30 min   | 40-60%            |
| OAuth Provider Config | 10 min   | 60-70%            |

### 4.2 Personal-Service

**Root Cause**: `findByIdAndUserId()` loads entire resume with all relations for simple ownership verification.

**Fix**: Create lightweight `verifyOwnership()` method using `count()` instead of full fetch.

### 4.3 Audit-Service

**Critical Issue**: `export.service.ts` uses in-memory Map (memory leak).

**Fix**: Move to Valkey with 24h TTL.

### 4.4 Analytics-Service

**Critical Issue**: `getSummary()` executes 6 parallel queries on same events table.

**Fix Options**:

1. Incremental Materialized View (recommended)
2. Single query with multiple aggregations
3. Pre-compute daily summaries

---

## 5. Implementation Priority

### Phase 1: Quick Wins (1-2 days)

| Task                                     | Impact              | Effort  |
| ---------------------------------------- | ------------------- | ------- |
| Fix `storage.service.ts` uuid() calls    | UUIDv7 compliance   | 30 min  |
| Add `verifyOwnership()` to ResumeService | 50% query reduction | 2 hours |
| Parallelize ExportService queries        | 60% faster exports  | 1 hour  |

### Phase 2: Caching Foundation (3-5 days)

| Task                                | Impact                         | Effort  |
| ----------------------------------- | ------------------------------ | ------- |
| Setup CacheConfigModule with Valkey | Infrastructure                 | 4 hours |
| Cache role permissions              | 70-80% auth query reduction    | 2 hours |
| Cache service config                | 50-70% service query reduction | 2 hours |
| Move ExportService to Valkey        | Fix memory leak                | 2 hours |

### Phase 3: ClickHouse Optimization (1 week)

| Task                                      | Impact              | Effort  |
| ----------------------------------------- | ------------------- | ------- |
| Create behavior_summary_mv                | 80% query reduction | 1 day   |
| Merge ConsentHistoryService stats queries | 60% query reduction | 4 hours |
| Batch funnel step time queries            | Remove N-1 pattern  | 4 hours |

---

## 6. Monitoring Recommendations

| Metric                     | Target  | Alert Threshold |
| -------------------------- | ------- | --------------- |
| Cache hit rate             | > 80%   | < 60%           |
| DB query count per request | < 5     | > 15            |
| P95 latency                | < 200ms | > 500ms         |
| Valkey memory usage        | < 1GB   | > 2GB           |

---

**LLM Reference**: `docs/llm/reports/OPTIMIZATION_REPORT_2025.md`
