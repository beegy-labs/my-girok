# Web-Admin Refactoring - Progress Tracker

> **Last Updated**: 2026-01-20
> **Current Focus**: Observability Visualization - Grafana Dashboards (P1 - High)

---

## Completed Phases

### ✅ Phase 0: HR Service Structure Backup
**Status**: Complete
**PR**: #584 (merged)
**Branch**: `feat/phase0-hr-service-structure`
**Completed**: 2026-01-18

**Deliverables**:
- Created `services/hr-service/` directory structure
- Added placeholder modules (attendance, leave, delegation, employee)
- Created Prisma schema (structure only, not applied to DB)
- Added README documentation for future migration

---

### ✅ Phase 1: Code Refactoring
**Status**: Complete (Combined with Phase 1.5, 2)
**PR**: #585 (merged)
**Branch**: Combined with Phase 1.5 and 2
**Completed**: 2026-01-18

**Deliverables**:
- Removed HR menu from menu.config.ts
- Removed /hr routes from router.tsx
- Ran eslint --fix, prettier --write
- Preserved HR code for future migration

---

### ✅ Phase 1.5: Global User Schema Design
**Status**: Complete (Combined with Phase 1, 2)
**PR**: #585 (merged)
**Completed**: 2026-01-18

**Deliverables**:
- Created `docs/llm/policies/user-schema.md` (SSOT)
- Created `.ai/user-schema.md` (indicator)
- Documented SCIM 2.0 Core Schema (RFC 7643)
- Designed Unified Customer Profile pattern

---

### ✅ Phase 2: Data Cleanup Design
**Status**: Complete (Combined with Phase 1, 1.5)
**PR**: #585 (merged)
**Completed**: 2026-01-18

**Deliverables**:
- Created `docs/llm/policies/data-migration.md` (SSOT)
- Created `.ai/data-migration.md` (indicator)
- Created `docs/migrations/drafts/*.sql` (design documents)
- Documented admins table cleanup plan

---

### ✅ Phase 3: Admin Account Management
**Status**: Complete
**PR**: #586 (merged)
**Branch**: `feat/phase3-admin-account`
**Started**: 2026-01-18
**Completed**: 2026-01-19

**Scope**:
- Backend: Admin account CRUD API in auth-service
- Frontend: Admin management UI in web-admin
- Tests: Unit tests for controller and service

**Deliverables**:
- AdminAccountService (CRUD operations)
- AdminAccountController (API endpoints)
- DTOs with validation (CreateAdminDto, UpdateAdminDto, etc.)
- AdminAccountsPage, AdminDetailPage, AdminEditPage
- API client (adminAccountsApi)
- Tests: 23 new tests (11 service + 12 controller)

**Event Architecture**:
- Events emitted to Kafka (6 admin event types)
- Consumer implementation: Post-Phase 3 task

---

### ✅ Phase 3.5: Documentation Optimization
**Status**: Complete
**PR**: #588 (merged)
**Branch**: `feat/optimize-documentation-structure`
**Completed**: 2026-01-19

**Scope**:
- Optimize `.ai/` directory (Tier 1) to under 50 lines per file
- Optimize `docs/llm/` directory (Tier 2) for token efficiency
- Standardize CLAUDE.md and GEMINI.md

**Deliverables**:
- Tier 1 (.ai/): 9 files optimized, 100% under 50 lines
- Tier 2 (docs/llm/): 10 major files optimized, 50%+ reduction
- Entry Points: CLAUDE.md, GEMINI.md (130 lines each)
- Total reduction: 4,501 lines (49.5%)
- Token savings: ~55,000 tokens per full read (50%)

**Impact**:
- Improved LLM parsing efficiency
- Consistent documentation format
- Better scannability and navigation

---

### ✅ Phase 10: HR Code Removal & Codebase Cleanup
**Status**: Complete
**PR**: #587 (merged)
**Branch**: `feat/phase10-hr-code-removal`
**Completed**: 2026-01-19

**Deliverables**: 60 files removed, codebase cleaned

---

### ✅ Post-Phase 3-P1: Audit Service Telemetry Gateway
**Status**: Complete
**PR**: #590 (merged)
**Branch**: `feat/otel-telemetry-gateway`
**Completed**: 2026-01-19

**Scope**:
- Implement OTLP receiver endpoints (traces, metrics, logs)
- Dual authentication (JWT + API Key)
- Rate limiting per signal type (Redis-backed)
- PII redaction (5 patterns)
- Tenant enrichment and cost tracking
- HTTP/JSON forwarding to OTEL Collector

**Deliverables**:
- OtlpReceiverController (3 endpoints)
- OtlpReceiverService (enrichment, redaction, forwarding)
- TenantAuthGuard (JWT + API Key)
- TelemetryModule with Redis rate limiting
- **Total added**: 2823 lines
- **Tests**: 83 tests passing (18 unit + 15 e2e)

**Repository**: my-girok

---

### ✅ Post-Phase 3-P2: OTEL Collector Configuration
**Status**: Complete
**PR**: #525 (merged)
**Branch**: `feat/otel-kafka-exporter`
**Completed**: 2026-01-19

**Scope**:
- Configure OTEL Collector with Kafka exporter
- ExternalSecret for Redpanda credentials
- Dual export path (ClickHouse + Kafka)
- Telemetry gateway deployment (dev only)

**Deliverables**:
- Kafka exporter to Redpanda (topic: otel-telemetry)
- ExternalSecret for SASL credentials
- Updated pipelines (traces, metrics, logs)
- Audit-service telemetry gateway config (dev)
- Fixed missing grpcPort (auth-service, legal-service)

**Repository**: platform-gitops

---

### ✅ Post-Phase 3-P3: ClickHouse Kafka Engine Integration
**Status**: Complete
**Completed**: 2026-01-20

**Scope**:
- ClickHouse Kafka Engine tables with JSONAsString format
- MergeTree tables with 7-year retention (logs), 90-day (traces), 1-year (metrics)
- Materialized Views with key-based attribute extraction
- NULL-safe parsing for all OTLP fields

**Migrations Applied**:
1. Migration 007: JSONAsString format + SASL authentication
2. Migration 008: arrayFirst key-based attribute extraction
3. Migration 009: NULL-safe severityNumber handling
4. Migration 010: Complete NULL-safe parsing (observedTimeUnixNano, K8s attributes)

**Result**:
- 3,779 logs successfully stored
- 2 services tracked (audit-service, auth-service)
- 10 namespaces (storage, ci-cd, dev-my-girok, vpn, vault, monitoring, etc.)
- 0 consumer lag across all partitions
- Date range: 2026-01-19 15:19 ~ 2026-01-20 03:15

**Repository**: my-girok (migrations), platform-gitops (Redpanda config)

---

### ✅ Post-Phase 3-P4: Frontend SDK Integration
**Status**: Complete
**Completed**: 2026-01-19

**Deliverables**:
- Created packages/otel-web-sdk with browser OTEL SDK
- Integrated in apps/web-girok (React 19)
- User interaction tracking, resource timing
- API key authentication support

**Repository**: my-girok

---

### ✅ Post-Phase 3-P5: Backend Instrumentation
**Status**: Complete
**Completed**: 2026-01-19

**Deliverables**:
- OTEL SDK in packages/nest-common
- Initialized in audit-service/src/main.ts
- Initialized in auth-service/src/main.ts
- Auto-instrumentation for HTTP, gRPC, Prisma
- Custom spans for business logic

**Repository**: my-girok

---

### ✅ Post-Phase 3-P6: OTLP JSON Parsing
**Status**: Complete
**Completed**: 2026-01-20

**Scope**:
- Fixed OTLP JSON nested structure parsing
- Key-based attribute extraction instead of positional indexing
- Complete NULL-safe handling for all fields

**Technical Solution**:
- Used `arrayFirst(x -> x.1 = 'key', attrs).2` for key-based lookup
- Added `coalesce` with fallback values for missing attributes
- Used `toUInt8OrZero`, `toUInt64OrZero` for NULL-safe conversions

**Result**: Successfully parsing all OTLP messages with 0 errors

**Repository**: my-girok (migrations), platform-gitops (OTEL Collector routing fix)

---

## Next Priority Task

### 📋 Observability Visualization - Grafana Dashboards (P1)
**Status**: Ready for Implementation
**Dependencies**: Post-Phase 3-P3 ✅, Post-Phase 3-P6 ✅
**Estimated Effort**: 2-3 days

**Scope**:
- Create Grafana dashboards for audit logs
- Configure alerting for consumer lag > 100 messages
- Add trace visualization (Jaeger or Grafana Tempo integration)
- Create service-level metrics dashboards
- Document query patterns for audit compliance

**Key Deliverables**:
1. Audit Logs Dashboard (ClickHouse data source)
2. Service Performance Dashboard (traces, metrics)
3. Consumer Lag Alerts (Prometheus alerts)
4. Compliance Report Templates (SQL queries)
5. Query documentation for common use cases

---

## Planned Phases (P2-P3)

### 📋 Phase 4: Permission Management System (P2)
**Status**: Planned
**Dependencies**: Phase 3 (Complete ✅)
**Estimated Effort**: 4-5 days

**Scope**:
- OpenFGA model extensions
- Permission management UI
- Role-based access control refinement

**Database Migration**: OpenFGA DSL Update (not goose)

---

### 📋 Phase 5: Service Management Framework (P2)
**Status**: Planned
**Dependencies**: Phase 4
**Estimated Effort**: 5-7 days

**Scope**:
- Service Registry
- [appId] dynamic routing
- Feature Flags management
- Maintenance Mode control

**Database Migration**: Required (goose)
New tables: app_registry, app_versions, feature_flags, remote_configs, maintenance_schedules

---

### 📋 Phase 5.5: App Management (P2)
**Status**: Planned
**Dependencies**: Phase 5
**Estimated Effort**: 4-5 days

**Scope**:
- Mobile app version control
- Force update policy
- Ad management
- Push notification campaigns

**Database Migration**: Required (goose, extends Phase 5 tables)

---

### 📋 Phase 5.6: auth-bff gRPC (P2)
**Status**: Planned
**Dependencies**: Phase 5.5
**Estimated Effort**: 4-5 days

**Scope**:
- Proto definitions for mobile apps
- gRPC Services (AppCheck, AppSession, AppConfig)
- Guards & Interceptors

**Database Migration**: Not Required (gRPC only)

---

### 📋 Phase 6: Analytics Dashboard (P3)
**Status**: Planned
**Dependencies**: Phase 5
**Estimated Effort**: 5-7 days

**Scope**:
- Dashboard components package
- ClickHouse query builder
- Custom query management

**Database Migration**: Required (goose)
New tables: saved_queries, dashboard_configs

---

### 📋 Phase 7: Audit System (P3)
**Status**: Planned
**Dependencies**: Phase 6
**Estimated Effort**: 5-7 days

**Scope**:
- Session replay enhancements
- Heatmaps (click, scroll)
- Path analysis
- Web Vitals tracking

**Database Migration**: Required (goose, ClickHouse)
New tables: heatmap_events, path_events, web_vitals, goal_conversions

---

### 📋 Phase 8: Notification Service (P3)
**Status**: Planned
**Dependencies**: Kafka/Redpanda infrastructure
**Estimated Effort**: 7-10 days

**Scope**:
- Email/Push/SMS/In-App notification infrastructure
- Mail service DB (receiving)
- MJML templates

**Database Migration**: Required (goose)
New DB: mail_db with mailboxes, messages, folders, attachments, contacts

---

### 📋 Phase 9: Settings & System Config (P3)
**Status**: 75% Complete (Backend done, Frontend partial)
**Dependencies**: None
**Estimated Effort**: 5-7 days (remaining)

**Scope**:
- Service Configuration Page (frontend)
- Service Features Page (frontend)
- Country Configuration Page (frontend)

**Database Migration**: Not Required (Frontend only)

---

## Migration Status Summary

| Phase | Migration Type | Database | Status |
|-------|---------------|----------|--------|
| Phase 0-2 | None | - | ✅ Complete (Design only) |
| Phase 3 | None | auth_db | ✅ Complete (Uses existing tables) |
| Phase 3.5 | None | - | ✅ Complete (Documentation only) |
| Phase 10 | None | - | ✅ Complete (Code removal only) |
| Post-Phase 3-P1 | None | - | ✅ Complete (PR #590, Gateway only) |
| Post-Phase 3-P2 | Helm (platform-gitops) | - | ✅ Complete (PR #525, OTEL Collector) |
| Post-Phase 3-P3 | goose (ClickHouse) | audit_db_dev | ✅ Complete (Migrations 007-010) |
| Post-Phase 3-P4 | None | - | ✅ Complete (packages/otel-web-sdk) |
| Post-Phase 3-P5 | None | - | ✅ Complete (nest-common instrumentation) |
| Post-Phase 3-P6 | goose (ClickHouse) | audit_db_dev | ✅ Complete (arrayFirst + NULL-safe) |
| Phase 4 | OpenFGA DSL | authorization_db | 📋 Planned |
| Phase 5 | goose | auth_db | 📋 Planned |
| Phase 5.5 | goose | auth_db | 📋 Planned |
| Phase 5.6 | None | - | 📋 Planned (gRPC only) |
| Phase 6 | goose | analytics_db | 📋 Planned |
| Phase 7 | goose (ClickHouse) | audit_db | 📋 Planned |
| Phase 8 | goose | mail_db (new) | 📋 Planned |
| Phase 9 | None | - | 🚧 75% Complete (Frontend only) |

---

## Summary

### Completed (14 phases)
1. ✅ Phase 0: HR Service Structure Backup
2. ✅ Phase 1: Code Refactoring (HR menu removal)
3. ✅ Phase 1.5: Global User Schema Design
4. ✅ Phase 2: Data Cleanup Design
5. ✅ Phase 3: Admin Account Management
6. ✅ Phase 3.5: Documentation Optimization
7. ✅ Phase 10: HR Code Removal & Codebase Cleanup
8. ✅ Post-Phase 3-P1: Audit Service Telemetry Gateway (PR #590)
9. ✅ Post-Phase 3-P2: OTEL Collector Configuration (PR #525)
10. ✅ Post-Phase 3-P3: ClickHouse Kafka Engine Integration (Migrations 007-010)
11. ✅ Post-Phase 3-P4: Frontend SDK Integration (packages/otel-web-sdk)
12. ✅ Post-Phase 3-P5: Backend Instrumentation (nest-common + services)
13. ✅ Post-Phase 3-P6: OTLP JSON Parsing (arrayFirst + NULL-safe)
14. ✅ Redpanda Standard Architecture (9093 internal + 9094 external)

### Next Immediate Action (P1 - High)

**Observability Visualization - Grafana Dashboards**
- **Priority**: P1 - High (Enable production monitoring)
- **Estimated**: 2-3 days
- **Scope**: Grafana dashboards, alerting, trace visualization
- **Environment**: dev → release → main

### Pending Phases (7)
- Phase 4: Permission Management (P2)
- Phase 5: Service Management Framework (P2)
- Phase 5.5: App Management (P2)
- Phase 5.6: auth-bff gRPC (P2)
- Phase 6: Analytics Dashboard (P3)
- Phase 7: Audit System (P3)
- Phase 8: Notification Service (P3)
- Phase 9: Settings & System Config (75% done, P3)

---

**References**:
- Master Plan: `.tasks/MASTER_PROJECT_PLAN.md`
- Phase Documents: `.tasks/phases/`
- Git Flow: `.ai/git-flow.md`
- Database Policy: `docs/llm/policies/database.md`
- Documentation Policy: `docs/llm/policies/documentation-architecture.md`
