# Final Service Optimization Report

> Generated: 2025-12-28 | Branch: feat/global-account-system

## Overview

| Service               | Cache Opportunities | MV Candidates | Priority Items                    |
| --------------------- | ------------------- | ------------- | --------------------------------- |
| **auth-service**      | 12                  | 0             | Role permissions, Service lookup  |
| **personal-service**  | 12                  | 0             | Public resume, User preferences   |
| **audit-service**     | 10                  | 0             | Export store migration (CRITICAL) |
| **analytics-service** | 8                   | 4             | Behavior summary, Session metrics |
| **Total**             | **42**              | **4**         | -                                 |

---

## 1. Auth-Service Caching Opportunities

### High Priority (12 opportunities)

| #   | Method                     | File:Line                    | Cache Key                                | TTL |
| --- | -------------------------- | ---------------------------- | ---------------------------------------- | --- |
| 1   | `getAdminPermissions()`    | admin-auth.service.ts:223    | `auth:permissions:{roleId}`              | 24h |
| 2   | `getAdminServices()`       | admin-auth.service.ts:286    | `auth:admin_services:{adminId}`          | 12h |
| 3   | `login()` (admin profile)  | admin-auth.service.ts:30     | `auth:admin:email:{email}`               | 4h  |
| 4   | `refresh()` (session)      | admin-auth.service.ts:100    | `auth:session:{tokenHash}`               | 14d |
| 5   | `getOperatorPermissions()` | operator-auth.service.ts:331 | `auth:operator_perms:{operatorId}`       | 24h |
| 6   | `login()` (operator)       | operator-auth.service.ts:58  | `auth:operator:{email}:{serviceSlug}`    | 4h  |
| 7   | Service lookup (6 methods) | services.service.ts:81-463   | `auth:service:{slug}`                    | 24h |
| 8   | Legal document             | legal.service.ts:219         | `auth:legal:{type}:{locale}`             | 48h |
| 9   | Consent requirements       | services.service.ts:95       | `auth:consent_req:{serviceId}:{country}` | 7d  |
| 10  | User services              | auth.service.ts:240          | `auth:user_services:{userId}`            | 1h  |
| 11  | Admin scope                | operator.service.ts:58       | `auth:admin_scope:{adminId}`             | 6h  |
| 12  | Tenant admin count         | tenant.service.ts:72-307     | `auth:tenant_admin_count:{tenantId}`     | 1h  |

### Invalidation Events

| Event                      | Invalidate Keys                                           |
| -------------------------- | --------------------------------------------------------- |
| Role permission update     | `auth:permissions:{roleId}`                               |
| Admin profile update       | `auth:admin:*:{adminId}`, `auth:admin_services:{adminId}` |
| Service update             | `auth:service:{slug}`, `auth:consent_req:{serviceId}:*`   |
| Legal document publish     | `auth:legal:{type}:{locale}`                              |
| User service join/withdraw | `auth:user_services:{userId}`                             |

---

## 2. Personal-Service Caching Opportunities

### High Priority (12 opportunities)

| #   | Method                        | File:Line                      | Cache Key                             | TTL       |
| --- | ----------------------------- | ------------------------------ | ------------------------------------- | --------- |
| 1   | `getDefaultResume()`          | resume.service.ts:341          | `personal:resume_default:{userId}`    | 30m       |
| 2   | `findAllByUserId()`           | resume.service.ts:326          | `personal:resumes_all:{userId}`       | 20m       |
| 3   | `findByIdAndUserId()`         | resume.service.ts:357          | `personal:resume:{resumeId}:{userId}` | 15m       |
| 4   | `findById()` (public)         | resume.service.ts:904          | `personal:resume_public:{resumeId}`   | 60m       |
| 5   | `getPublicResumeByUsername()` | resume.service.ts:947          | `personal:resume_username:{username}` | 120m      |
| 6   | Username → ID (HTTP)          | resume.service.ts:951          | `personal:user_id:{username}`         | 240m      |
| 7   | `getAttachments()`            | resume.service.ts:1070         | `personal:attachments:{resumeId}`     | 10m       |
| 8   | `getPublicResume()` (share)   | share.service.ts:124           | `personal:sharelink:{token}`          | 5m        |
| 9   | `findAllByUser()` (share)     | share.service.ts:58            | `personal:sharelinks:{userId}`        | 15m       |
| 10  | `getUserPreferences()`        | user-preferences.service.ts:23 | `personal:prefs:{userId}`             | 60m       |
| 11  | `getPresignedUrl()`           | storage.service.ts:241         | `personal:presigned:{fileKey}`        | expiry-1m |
| 12  | Image metadata                | resume.controller.ts:65        | `personal:image_meta:{fileKey}`       | 24h       |

### Critical Path: Public Resume by Username

```
Request → Check Valkey → HIT → Return cached resume
                       ↓
                      MISS → HTTP call to auth-service (get userId)
                           → Query resume from DB
                           → Store in Valkey
                           → Return resume
```

**Optimization**: Also cache `personal:user_id:{username}` to avoid HTTP call.

---

## 3. Audit-Service Caching Opportunities

### CRITICAL: Export Store Migration

**Current Issue** (`export.service.ts:6`):

```typescript
const exportStore = new Map<string, ExportResponseDto>(); // Memory leak!
```

**Problems:**

- No persistence across restarts
- Memory grows indefinitely
- Data loss on deployment

**Solution**: Migrate to Valkey with TTL:

```typescript
await this.cache.set(`audit:export:${exportId}`, data, 86400000); // 24h
```

### Cache Opportunities (10 items)

| #   | Method                    | File:Line                      | Cache Key                        | TTL |
| --- | ------------------------- | ------------------------------ | -------------------------------- | --- |
| 1   | Export store              | export.service.ts:6-50         | `audit:export:{id}`              | 24h |
| 2   | `getConsentStats()`       | consent-history.service.ts:146 | `audit:consent_stats:{dates}`    | 15m |
| 3   | `getConsentHistory()`     | consent-history.service.ts:27  | `audit:consent_history:{params}` | 5m  |
| 4   | `getUserConsentHistory()` | consent-history.service.ts:113 | `audit:user_consent:{userId}`    | 30m |
| 5   | `getAccessLogs()`         | audit-query.service.ts:24      | `audit:access_logs:{params}`     | 5m  |
| 6   | `getAccessLogById()`      | audit-query.service.ts:103     | `audit:access_log:{id}`          | 1h  |
| 7   | `getAdminActions()`       | admin-action.service.ts:25     | `audit:admin_actions:{params}`   | 10m |
| 8   | `getAdminActionById()`    | admin-action.service.ts:109    | `audit:admin_action:{id}`        | 1h  |
| 9   | `getPolicies()`           | retention.service.ts:103       | `audit:retention_policies`       | 1h  |
| 10  | `getPolicy()`             | retention.service.ts:107       | `audit:retention_policy:{id}`    | 30m |

### Query Optimization: Consent Stats

**Before**: 3 separate ClickHouse queries

```sql
-- Query 1: Overall stats
SELECT count(), countIf(agreed=1), countIf(agreed=0) FROM consent_history WHERE ...
-- Query 2: By type
SELECT consent_type, countIf(agreed=1), countIf(agreed=0) GROUP BY consent_type
-- Query 3: By country
SELECT country_code, countIf(agreed=1), countIf(agreed=0) GROUP BY country_code
```

**After**: Single query with multiple aggregations (or cache result)

---

## 4. Analytics-Service Optimization

### Valkey Cache Opportunities (8 items)

| #   | Method                   | Cache Key                                         | TTL |
| --- | ------------------------ | ------------------------------------------------- | --- |
| 1   | `getSummary()`           | `analytics:behavior_summary:{date}`               | 5m  |
| 2   | `getTopEvents()`         | `analytics:top_events:{dates}:{category}:{limit}` | 5m  |
| 3   | `getEventsByCategory()`  | `analytics:events_by_category:{dates}`            | 5m  |
| 4   | `getUserActivity()`      | `analytics:user_activity:{userId}:{dates}`        | 10m |
| 5   | `getSummary()` (session) | `analytics:session_summary:{dates}`               | 5m  |
| 6   | `getByDimension()`       | `analytics:session_dim:{dimension}:{dates}`       | 15m |
| 7   | `getDistribution()`      | `analytics:session_dist:{dates}`                  | 5m  |
| 8   | `analyzeFunnel()`        | `analytics:funnel:{id}:{dates}:{groupBy}`         | 15m |

### ClickHouse Materialized Views (4 items)

| MV Name                      | Type        | Base Table    | Refresh   |
| ---------------------------- | ----------- | ------------- | --------- |
| `mv_event_timeseries_hourly` | Incremental | events        | Real-time |
| `mv_session_metrics`         | Incremental | sessions      | Real-time |
| `mv_session_distributions`   | Refreshable | sessions      | Hourly    |
| `mv_funnel_conversions`      | Incremental | funnel_events | Real-time |

### MV Example: Event Timeseries

```sql
CREATE MATERIALIZED VIEW analytics_db.mv_event_timeseries_hourly
ENGINE = SummingMergeTree()
ORDER BY (event_date, service_id)
AS SELECT
  toDate(timestamp) as event_date,
  service_id,
  count() as total_events,
  uniq(user_id) as unique_users,
  uniq(session_id) as unique_sessions
FROM analytics_db.events
GROUP BY event_date, service_id
```

---

## 5. Implementation Roadmap

### Phase 1: Infrastructure Setup (Day 1-2)

```bash
# Add dependencies to each service
pnpm add @nestjs/cache-manager cache-manager cache-manager-ioredis-yet ioredis
```

```typescript
// Module configuration
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async (config: ConfigService) => ({
    store: await redisStore({
      host: config.get('VALKEY_HOST'),
      port: config.get('VALKEY_PORT', 6379),
      password: config.get('VALKEY_PASSWORD'),
      ttl: 300000, // 5m default
    }),
  }),
  inject: [ConfigService],
});
```

### Phase 2: Critical Fixes (Day 3-4)

| Priority | Service  | Task                                |
| -------- | -------- | ----------------------------------- |
| P0       | audit    | Migrate export store to Valkey      |
| P0       | personal | Fix `storage.service.ts` UUID calls |
| P1       | auth     | Cache role permissions              |
| P1       | personal | Cache public resume by username     |

### Phase 3: High-Value Caches (Day 5-7)

| Service  | Cache Target               | Expected Impact      |
| -------- | -------------------------- | -------------------- |
| auth     | Service lookup             | 6x query reduction   |
| auth     | Admin/Operator permissions | 70% auth speedup     |
| personal | User preferences           | Every request faster |
| audit    | Paginated queries          | 50% query reduction  |

### Phase 4: Analytics Optimization (Week 2)

| Task                                | Type   | Impact                       |
| ----------------------------------- | ------ | ---------------------------- |
| Create `mv_event_timeseries_hourly` | MV     | 85% behavior query reduction |
| Create `mv_session_metrics`         | MV     | 80% session query reduction  |
| Cache top events                    | Valkey | 70% cache hit rate           |
| Cache session dimensions            | Valkey | 75% cache hit rate           |

---

## 6. Cache Key Namespace Summary

```
# Auth Service
auth:permissions:{roleId}
auth:admin_services:{adminId}
auth:admin:email:{email}
auth:session:{tokenHash}
auth:operator_perms:{operatorId}
auth:operator:{email}:{serviceSlug}
auth:service:{slug}
auth:legal:{type}:{locale}
auth:consent_req:{serviceId}:{country}
auth:user_services:{userId}

# Personal Service
personal:resume_default:{userId}
personal:resumes_all:{userId}
personal:resume:{resumeId}:{userId}
personal:resume_public:{resumeId}
personal:resume_username:{username}
personal:user_id:{username}
personal:attachments:{resumeId}
personal:sharelink:{token}
personal:sharelinks:{userId}
personal:prefs:{userId}

# Audit Service
audit:export:{id}
audit:consent_stats:{dates}
audit:consent_history:{params}
audit:user_consent:{userId}
audit:access_logs:{params}
audit:access_log:{id}
audit:admin_actions:{params}
audit:admin_action:{id}
audit:retention_policies
audit:retention_policy:{id}

# Analytics Service
analytics:behavior_summary:{date}
analytics:top_events:{dates}:{category}:{limit}
analytics:events_by_category:{dates}
analytics:user_activity:{userId}:{dates}
analytics:session_summary:{dates}
analytics:session_dim:{dimension}:{dates}
analytics:session_dist:{dates}
analytics:funnel:{id}:{dates}:{groupBy}
```

---

## 7. Expected Performance Impact

### Query Reduction

| Service             | Current Queries/Request | With Cache | Reduction |
| ------------------- | ----------------------- | ---------- | --------- |
| auth (login)        | 5-8                     | 1-2        | 75%       |
| personal (resume)   | 4-6                     | 1          | 80%       |
| audit (list)        | 2                       | 1 or 0     | 50-100%   |
| analytics (summary) | 6                       | 1          | 85%       |

### Memory Estimate

| Service   | Keys  | Avg Size | TTL    | Memory    |
| --------- | ----- | -------- | ------ | --------- |
| auth      | ~1000 | 2KB      | 4-24h  | 2MB       |
| personal  | ~5000 | 5KB      | 5-60m  | 25MB      |
| audit     | ~500  | 3KB      | 5m-24h | 1.5MB     |
| analytics | ~1000 | 3KB      | 5-15m  | 3MB       |
| **Total** | ~7500 | -        | -      | **~32MB** |

---

## 8. Monitoring Metrics

### Key Metrics to Track

| Metric                 | Target  | Alert   |
| ---------------------- | ------- | ------- |
| Cache hit rate         | > 80%   | < 60%   |
| Cache latency (GET)    | < 1ms   | > 5ms   |
| DB query count/request | < 3     | > 10    |
| Valkey memory          | < 100MB | > 200MB |
| TTL expiration rate    | Normal  | Spike   |

### Logging Pattern

```typescript
// Add to all cache operations
this.logger.debug(`Cache ${hit ? 'HIT' : 'MISS'}: ${key}`, {
  service: 'auth',
  method: 'getPermissions',
  key,
  hit,
  latencyMs,
});
```

---

## 9. Related Documents

- **Caching Policy (LLM)**: `.ai/caching.md`
- **Caching Policy (Human)**: `docs/policies/CACHING.md`
- **Architecture**: `.ai/architecture.md`
- **Previous Report**: `.ai/reports/OPTIMIZATION_REPORT_2025.md`

---

## 10. Action Items

### Immediate (This Sprint)

- [ ] Set up Valkey infrastructure
- [ ] Migrate audit export store (CRITICAL)
- [ ] Fix personal-service UUID calls (5 files)
- [ ] Implement auth role permissions cache

### Short-term (Next Sprint)

- [ ] Implement personal public resume cache
- [ ] Implement user preferences cache
- [ ] Add audit paginated query cache
- [ ] Create analytics behavior summary MV

### Medium-term (Month 2)

- [ ] Complete all 42 cache implementations
- [ ] Create all 4 ClickHouse MVs
- [ ] Add comprehensive monitoring
- [ ] Performance benchmarking
