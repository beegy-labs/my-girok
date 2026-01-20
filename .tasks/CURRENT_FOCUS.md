# Current Focus

> **Last Updated**: 2026-01-20
> **Status**: OTEL Pipeline Complete - Ready for Grafana Dashboards

---

## ✅ Recently Completed

### Post-Phase 3-P3 + P6: ClickHouse OTLP Pipeline (2026-01-20)
- **Commits**: my-girok #94c0b4d, platform-gitops #e91c0d5c
- **Migrations**: 007 (OTLP JSON), 008 (arrayFirst), 009 (NULL severity), 010 (Complete NULL handling)
- **Impact**: Complete OTLP → Kafka → ClickHouse pipeline operational
- **Result**: 3,779 logs successfully stored, 0 consumer lag, 2 services tracked across 10 namespaces
- **Architecture**: Redpanda standard (9093 internal + 9094 external), OTEL Collector internal routing, ClickHouse external connection

### Post-Phase 3-P4 + P5: SDK Integration (2026-01-19)
- **Frontend SDK**: packages/otel-web-sdk with browser OTEL SDK
- **Backend SDK**: packages/nest-common with auto-instrumentation
- **Impact**: Services instrumented with HTTP, gRPC, Prisma auto-instrumentation
- **Result**: Full telemetry collection from frontend and backend

### Post-Phase 3-P2: OTEL Collector Configuration (2026-01-19)
- **PR**: platform-gitops #525 (merged to develop)
- **Impact**: Kafka exporter to Redpanda, dual export path
- **Result**: OTEL Collector forwarding to ClickHouse + Kafka

### Post-Phase 3-P1: Audit Service Telemetry Gateway (2026-01-19)
- **PR**: #590 (merged to develop)
- **Impact**: Secure gateway for all telemetry data (traces, metrics, logs)
- **Result**: 2823 lines added, 83 tests passing, all CI green

---

## 🎯 Next Priority Task

### 1. Observability Visualization (P1 - High) ⚡

**Why Important?**: Enable monitoring and debugging of production systems with visual dashboards.

**Architecture**: Grafana dashboards for ClickHouse OTLP data

**Scope**:
- Create Grafana dashboards for audit logs
- Configure alerting for consumer lag
- Add trace visualization (Jaeger or Grafana Tempo)
- Create service-level metrics dashboards
- Document query patterns for audit compliance

**Estimated Effort**: 2-3 days

**Documentation**: Create new task document

**Implementation Steps**:
1. Review ClickHouse Kafka Engine documentation
2. Create migration file: `20260120000000_otel_audit_tables.sql`
3. Define Kafka Engine tables (audit_logs_queue, audit_traces_queue, audit_metrics_queue)
4. Define MergeTree tables (otel_audit_logs, otel_audit_traces, otel_audit_metrics)
5. Create Materialized Views for data transformation
6. Configure SASL authentication for Kafka connection
7. Test with sample telemetry data
8. Verify data ingestion and querying

**Technical Details**:
- Kafka Broker: `kafka.girok.dev:9093` (SASL SCRAM-SHA-256)
- Topics: `otel-telemetry` (single topic from OTEL Collector)
- Format: OTLP Protobuf
- Retention: Logs (7y), Traces (90d), Metrics (1y)
- Partitioning: Monthly (toYYYYMM)
- Environment: **dev only** (release/prod later)

---

## 📊 Progress Overview

### Completed Phases (9)
1. ✅ Phase 0: HR Service Structure Backup
2. ✅ Phase 1: Code Refactoring
3. ✅ Phase 1.5: Global User Schema Design
4. ✅ Phase 2: Data Cleanup Design
5. ✅ Phase 3: Admin Account Management
6. ✅ Phase 3.5: Documentation Optimization
7. ✅ Phase 10: HR Code Removal & Codebase Cleanup
8. ✅ Post-Phase 3-P1: Audit Gateway (PR #590)
9. ✅ Post-Phase 3-P2: OTEL Collector (PR #525)

### Planned Phases (12)
- 📋 Post-Phase 3-P3: ClickHouse Kafka (P1) ⚡ **← YOU ARE HERE**
- 📋 Post-Phase 3-P4: Frontend SDK (P2)
- 📋 Post-Phase 3-P5: Backend Instrumentation (P2)
- 📋 Phase 4: Permission Management (P2)
- 📋 Phase 5: Service Management Framework (P2)
- 📋 Phase 5.5: App Management (P2)
- 📋 Phase 5.6: auth-bff gRPC (P2)
- 📋 Phase 6: Analytics Dashboard (P3)
- 📋 Phase 7: Audit System (P3)
- 📋 Phase 8: Notification Service (P3)
- 🚧 Phase 9: Settings & System Config (75% done, P3)

---

## 🚀 Start Now

**Recommended Command**:
```bash
# Read implementation plan first
cat .tasks/POST_PHASE3_P1_AUDIT_GATEWAY.md

# Create feature branch
git checkout develop
git pull
git checkout -b feat/otel-audit-gateway

# Start implementation
cd services/audit-service
```

**Why Start Now?**:
- ⚡ P1 High priority
- 🏗️ Foundation for unified observability
- ⏱️ Reasonable effort (2-3 days)
- 🔒 Security-first architecture
- 📊 Enables full telemetry pipeline

---

## 📋 Future Tasks (After OTEL Pipeline)

### Post-Phase 3-P2: OTEL Collector Configuration (P1)
- **Estimated**: 1-2 days
- **Dependency**: Post-Phase 3-P1 ✅
- **Scope**: Deploy OTEL Collector, Kafka exporter, NetworkPolicy

### Post-Phase 3-P3: ClickHouse Kafka Engine (P1)
- **Estimated**: 1-2 days
- **Dependency**: Post-Phase 3-P2 ✅
- **Scope**: Kafka Engine tables, Materialized Views, TTL policies

### Post-Phase 3-P4: Frontend SDK (P2)
- **Estimated**: 1-2 days
- **Dependency**: Post-Phase 3-P1 ✅
- **Scope**: Browser SDK package, React integration

### Post-Phase 3-P5: Backend Instrumentation (P2)
- **Estimated**: 1-2 days
- **Dependency**: Post-Phase 3-P1 ✅
- **Scope**: NestJS OTEL module, service instrumentation

### Phase 4: Permission Management System (P2)
- **Estimated**: 4-5 days
- **Dependency**: Phase 3 ✅ (Complete)
- **Scope**: OpenFGA extensions, Permission UI, RBAC refinement

### Phase 5-9: Additional Features (P2-P3)
- Service Management Framework
- App Management
- gRPC for mobile
- Analytics Dashboard
- Audit System enhancements
- Notification Service
- Settings & Config (75% done)

---

## 📚 References

- **Implementation Plan**: `.tasks/POST_PHASE3_P1_AUDIT_GATEWAY.md`
- **Full OTEL Architecture**: `docs/llm/policies/best-practices-2026.md` (OpenTelemetry section)
- **Progress Tracker**: `.tasks/PROGRESS.md`
- **Master Plan**: `.tasks/MASTER_PROJECT_PLAN.md`
- **Git Flow**: `.ai/git-flow.md`
- **Testing Policy**: `docs/llm/policies/testing.md`
