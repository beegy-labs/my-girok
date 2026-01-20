# Web-Admin Refactoring - Progress Tracker

> **Last Updated**: 2026-01-20
> **Current Focus**: Web-Admin 복구 완료 - Phase 4 Permission Management System merged

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

### ✅ Phase 4: Permission Management System
**Status**: Complete
**PR**: #592 (merged)
**Branch**: `feat/phase4-permission-system`
**Started**: 2026-01-20
**Completed**: 2026-01-20

**Scope**:
- Backend: Permission & Department management API
- Frontend: PermissionsPage & DepartmentsPage UI
- OpenFGA: Extended authorization model
- Templates: 9 built-in permission templates

**Deliverables**:
- **Backend (auth-bff)**:
  - PermissionController (14 endpoints) + PermissionService
  - DepartmentController (8 endpoints) + DepartmentService
  - DTOs with Zod validation
  - 9 permission templates (service-admin, operator, viewer, etc.)

- **Backend (authorization-service)**:
  - OpenFGA DSL: department, menu_item, role, resource_permission, country types
  - Department migration (20260120000000_add_departments_table.sql)
  - DepartmentRepository for CRUD operations

- **Frontend (web-admin)**:
  - PermissionsPage with 4 tabs (Admin/Team/Menu/Templates)
  - DepartmentsPage + DepartmentDetailPage
  - API clients: permissions.ts, departments.ts
  - Updated menu and router configuration

- **Code Quality**:
  - JSDoc documentation for all public methods
  - Type-safe code (no 'any' types)
  - NotImplementedException for unimplemented gRPC endpoints
  - +2,038 lines across 24 files

**Features**:
- Admin/Team/Department permission assignment
- Permission templates for quick assignment
- Hierarchical department structure (head/manager/member)
- Menu access control infrastructure
- Permission check API (single + batch)

**Note**: Department gRPC endpoints in authorization-service marked as TODO for future implementation

---

## Next Priority Task

### 📋 Phase 8: Notification Service (P2 - Optional)
**Status**: Optional (선택적 구현)
**Dependencies**: Kafka/Redpanda ✅
**Estimated Effort**: 3-4 days
**Purpose**: 관리자 초대 및 비밀번호 재설정 알림

**Scope** (간소화 버전):
- SendGrid/AWS SES 연동
- 관리자 초대 이메일
- 비밀번호 재설정 알림
- Kafka 이벤트 기반 발송

**Excluded** (나중에):
- Push/SMS/In-App notification
- Mail receiving (inbox)
- MJML 고급 템플릿

**Documentation**: `.tasks/phases/PHASE_8_NOTIFICATION_SERVICE.md`

---

## Planned Phases - Web-Admin 복구

### 📋 Phase 8: Notification Service (P2 - 선택적)
**Status**: Optional
**Dependencies**: Kafka/Redpanda ✅
**Estimated Effort**: 3-4일 (기본 버전)

**Scope** (간소화):
- SendGrid/AWS SES 연동
- 관리자 초대 이메일
- 비밀번호 재설정 알림
- Kafka 이벤트 기반 발송

**Excluded** (나중에):
- Push/SMS/In-App notification
- Mail receiving (inbox)
- MJML 고급 템플릿

**필요성**: 중간 (필요하면 기본 기능만 구현)

---

### 📋 Phase 9: Settings UI 완성 (P3 - 선택적)
**Status**: 75% Complete (Backend done, Frontend missing)
**Dependencies**: None
**Estimated Effort**: 2-3일

**Scope**:
- Service Configuration Page (frontend)
- Service Features Page (frontend)
- Country Configuration Page (frontend)

**필요성**: 낮음 (백엔드 완료, 프론트엔드 선택적)

---

## 제외 Phases (현재 불필요)

### ❌ Phase 5: Service Management Framework
**이유**: 서비스 수 적음, 동적 라우팅 불필요

### ❌ Phase 5.5: App Management
**이유**: 모바일 앱 없음

### ❌ Phase 5.6: auth-bff gRPC
**이유**: 모바일 앱 없음

### ❌ Phase 6: Analytics Dashboard
**이유**: ClickHouse 데이터는 Audit용, Grafana로 대체 가능

### ❌ Phase 7: Audit System 고도화
**이유**: Session recordings 있음, 서드파티로 대체 가능

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

### Completed (15 phases)
1. ✅ Phase 0-4: HR 제거, Admin Account Management, Permission Management System
2. ✅ Phase 10: HR Code Removal & Codebase Cleanup
3. ✅ Post-Phase 3 (P1-P6): OTEL Pipeline for Audit Service
   - 목적: Audit 서비스 데이터 수집
   - 결과: ClickHouse에 3,779+ 로그 정상 저장 중
   - 상태: 정상 작동 (0 consumer lag)

### Web-Admin 복구 완료 🎉
**Phase 4 완료로 핵심 Web-Admin 기능 복구 완료**
- ✅ Admin Account Management (Phase 3)
- ✅ Permission Management System (Phase 4)
- ✅ Department Hierarchy (Phase 4)
- ✅ Menu Access Control Infrastructure (Phase 4)

### Next Optional Tasks (P2-P3)

**Phase 8: Notification Service** (선택적, 3-4일)
- 관리자 초대 이메일
- 비밀번호 재설정 알림
- Kafka 이벤트 기반 발송

**Phase 9: Settings UI 완성** (선택적, 2-3일)
- Service Configuration Page (frontend)
- Frontend 일부만 남음 (backend 완료)

### 제외 작업 (현재 불필요)
- ❌ Phase 5: Service Management (서비스 수 적음)
- ❌ Phase 5.5, 5.6: App/gRPC (모바일 앱 없음)
- ❌ Phase 6: Analytics Dashboard (Grafana로 대체)
- ❌ Phase 7: Audit System 고도화 (서드파티로 대체)

---

**References**:
- Master Plan: `.tasks/MASTER_PROJECT_PLAN.md`
- Phase Documents: `.tasks/phases/`
- Git Flow: `.ai/git-flow.md`
- Database Policy: `docs/llm/policies/database.md`
- Documentation Policy: `docs/llm/policies/documentation-architecture.md`
