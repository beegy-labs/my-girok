# POST-PHASE3 OTEL Pipeline - Status Summary

> **Last Updated**: 2026-01-19 23:20 UTC
> **Overall Progress**: 83% (5/6 tasks completed)

---

## Task Overview

| Phase  | Task                         | Status         | Completion Date | Blocker              |
| ------ | ---------------------------- | -------------- | --------------- | -------------------- |
| P3     | ClickHouse Kafka Integration | ⚠️ Partial     | 2026-01-19      | Data format mismatch |
| P4     | Frontend SDK Integration     | ✅ Complete    | 2026-01-19      | -                    |
| P5     | Backend Instrumentation      | ✅ Complete    | 2026-01-19      | -                    |
| **P6** | **OTLP JSON Parsing**        | 🚧 In Progress | -               | **Critical**         |

---

## Current Pipeline Status

```
┌─────────────────────────────────────────────────────────────────────┐
│                     OTEL Pipeline Data Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Services (audit, auth)                                             │
│       │                                                             │
│       │ ✅ OTEL SDK initialized                                    │
│       │ ✅ HTTP/protobuf export to OTEL Collector                 │
│       ↓                                                             │
│  OTEL Collector (monitoring namespace)                              │
│       │                                                             │
│       │ ✅ Receives telemetry                                      │
│       │ ✅ Processors (k8sattributes, batch, memory_limiter)       │
│       │ ✅ Exports to Kafka (OTLP JSON)                           │
│       ↓                                                             │
│  Kafka (Redpanda)                                                   │
│       │                                                             │
│       │ ✅ Topics: otel.audit.logs, traces, metrics                │
│       │ ✅ SASL SCRAM-SHA-512 auth                                 │
│       │ ✅ Data retention: 7y logs, 90d traces, 1y metrics         │
│       ↓                                                             │
│  ClickHouse (Kafka Engine)                                          │
│       │                                                             │
│       │ ⚠️  Migration 006: Flat JSON schema (INCORRECT)            │
│       │ ❌ Cannot parse OTLP JSON nested structure                 │
│       │ ❌ Materialized Views not populating target tables         │
│       ↓                                                             │
│  Target Tables (MergeTree)                                          │
│       │                                                             │
│       │ ❌ otel_audit_logs: 0 rows                                 │
│       │ ❌ otel_audit_traces: 0 rows                               │
│       │ ❌ otel_audit_metrics: 0 rows                              │
│       ↓                                                             │
│  [BLOCKED - Awaiting Migration 007]                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Completed Work

### ✅ P3: ClickHouse Kafka Integration (Partial)

**Migrations Completed**:

- `005_create_audit_db_otel_tables.sql` - Created audit_db with target tables
- `006_add_kafka_sasl_auth.sql` - Added SASL authentication to Kafka Engine tables

**GitOps Deployments**:

- Added OTEL env vars to audit-service
- Added OTEL env vars to auth-service
- Fixed podSecurityContext (seccompProfile)
- Configured OTEL Collector with Kafka exporters

**Commits**:

- `my-girok@94c0b4d`: feat(observability): implement complete OTEL pipeline
- `platform-gitops@da34b510`: feat(observability): implement complete OTEL pipeline with Kafka integration
- `platform-gitops@366e8dee`: fix(audit-service): add seccompProfile to podSecurityContext

### ✅ P4: Frontend SDK Integration

**Implemented**:

- Created `packages/otel-web-sdk` with browser OTEL SDK
- Integrated in `apps/web-girok` (React 19)
- User interaction tracking, resource timing
- API key authentication support

### ✅ P5: Backend Instrumentation

**Implemented**:

- OTEL SDK in `packages/nest-common`
- Initialized in `audit-service/src/main.ts`
- Initialized in `auth-service/src/main.ts`
- Auto-instrumentation for HTTP, gRPC, Prisma
- Custom spans for business logic

---

## Blocking Issue: OTLP JSON Format Mismatch

### Problem

OTEL Collector sends OTLP JSON (nested structure):

```json
{
  "resourceLogs": [{
    "resource": {"attributes": [...]},
    "scopeLogs": [{
      "logRecords": [{
        "timeUnixNano": "1737328347000000000",
        "body": {"stringValue": "..."},
        ...
      }]
    }]
  }]
}
```

ClickHouse Kafka Engine expects flat JSON:

```json
{
  "timestamp": 1737328347.0,
  "body": "...",
  "service_name": "audit-service"
}
```

### Impact

- ❌ **Zero data in ClickHouse tables** despite Kafka receiving data
- ❌ **Audit compliance blocked** - 7-year retention not operational
- ❌ **Observability gaps** - No traces, metrics, or logs queryable
- ❌ **P3, P4, P5 work not delivering value** until parsing fixed

---

## Solution: Migration 007 (P6)

### Enterprise Architecture Decision

**Selected**: Kafka + JSONExtract Pattern ✅

**Rationale**:

1. OTLP standard compliance (vendor-neutral)
2. Kafka provides replay for 7-year audit retention
3. Multi-consumer support (future: Elasticsearch, S3 archive)
4. Fault isolation (ClickHouse downtime = no data loss)
5. Industry standard per 2026 best practices

**References**:

- [ClickHouse OTLP Best Practices](https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data)
- [JSONExtract Pattern](https://clickhouse.com/docs/knowledgebase/json_simple_example)
- [Altinity KB: JSONAsString Parser](https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/)

### Implementation Plan

1. ✅ Create `POST_PHASE3_P6_OTLP_JSON_PARSING.md` task
2. ⏳ Write migration 007 with JSONAsString + JSONExtract
3. ⏳ Update GitOps ConfigMap
4. ⏳ Deploy via ArgoCD
5. ⏳ Verify data flow end-to-end

---

## Next Steps

### Immediate (P0 - Critical)

1. **Create Migration 007** - OTLP JSON parsing with JSONExtract
2. **Test Locally** - Verify JSON extraction logic
3. **Deploy to Dev** - Run migration via ArgoCD
4. **Verify Data Flow** - Confirm tables populating
5. **Performance Tuning** - Optimize JSONExtract queries

### Short-term (P1)

1. Add Grafana dashboards for audit logs
2. Create alerts for consumer lag
3. Document OTLP schema mapping
4. Add integration tests

### Long-term (P2)

1. Add S3 cold storage tier (> 100GB/day)
2. Implement data retention policies
3. Add multi-tenant isolation queries
4. Optimize compression (target < 0.15 ratio)

---

## Metrics & KPIs

### Current Status

| Metric             | Target    | Actual | Status |
| ------------------ | --------- | ------ | ------ |
| Data in ClickHouse | > 0 rows  | 0 rows | ❌     |
| Consumer Lag       | < 100 msg | N/A    | ⏳     |
| Query Latency      | < 1s      | N/A    | ⏳     |
| Compression Ratio  | < 0.15    | N/A    | ⏳     |
| Pipeline Uptime    | 99.9%     | N/A    | ⏳     |

### Expected After P6

| Metric             | Target    | Expected | Status             |
| ------------------ | --------- | -------- | ------------------ |
| Data in ClickHouse | > 0 rows  | ✅       | After migration    |
| Consumer Lag       | < 100 msg | ✅       | Auto-balanced      |
| Query Latency      | < 1s      | ✅       | Indexed queries    |
| Compression Ratio  | < 0.15    | ✅       | CODEC(Delta, ZSTD) |
| Pipeline Uptime    | 99.9%     | ✅       | Kafka resilience   |

---

## Risk Assessment

| Risk                               | Probability | Impact | Mitigation                       |
| ---------------------------------- | ----------- | ------ | -------------------------------- |
| Migration 007 breaks existing data | Low         | High   | Rollback plan, test in dev first |
| JSONExtract performance issues     | Medium      | Medium | Add indexes, optimize queries    |
| Kafka consumer lag                 | Low         | Medium | Increase consumers, monitor lag  |
| ClickHouse storage exhausted       | Low         | High   | TTL policies, compression        |

---

**Status Updated By**: Claude Sonnet 4.5
**Next Review**: After Migration 007 deployment
