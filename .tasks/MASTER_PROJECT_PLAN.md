# Web-Admin Refactoring - Master Project Plan

> **Version**: 2.2
> **Created**: 2026-01-18
> **Last Updated**: 2026-01-20
> **Total Phases**: 14 (Phase 0 ~ Phase 10, including 1.5, 5.5, 5.6)
> **Completed Phases**: 14 (Phases 0-3, 10, Post-Phase 3 P1-P6)

---

## Quick Navigation

| Phase | Document | Status | Priority |
|-------|----------|--------|----------|
| [Phase 0](#phase-0-hr-service-structure) | [PHASE_0_HR_SERVICE_STRUCTURE.md](phases/PHASE_0_HR_SERVICE_STRUCTURE.md) | ✅ Complete | P1 |
| [Phase 1](#phase-1-code-refactoring) | [PHASE_1_CODE_REFACTORING.md](phases/PHASE_1_CODE_REFACTORING.md) | ✅ Complete | P1 |
| [Phase 1.5](#phase-15-global-user-schema) | [PHASE_1.5_GLOBAL_USER_SCHEMA.md](phases/PHASE_1.5_GLOBAL_USER_SCHEMA.md) | ✅ Complete | P1 |
| [Phase 2](#phase-2-data-cleanup-design) | [PHASE_2_DATA_CLEANUP_DESIGN.md](phases/PHASE_2_DATA_CLEANUP_DESIGN.md) | ✅ Complete | P1 |
| [Phase 3](#phase-3-admin-account-management) | [PHASE_3_ADMIN_ACCOUNT_MANAGEMENT.md](phases/PHASE_3_ADMIN_ACCOUNT_MANAGEMENT.md) | ✅ Complete | P1 |
| [Post-Phase 3](#post-phase-3-otel-observability-pipeline) | [POST_PHASE3_P1-P6](archived/) | ✅ Complete | P1 |
| [Phase 3-4 Analysis](#phase-3-4-permission-analysis) | [PHASE_3_4_PERMISSION_ANALYSIS.md](phases/PHASE_3_4_PERMISSION_ANALYSIS.md) | 📋 Reference | - |
| [Phase 4](#phase-4-permission-management) | [PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md](phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md) | 📋 Planned | P2 |
| [Phase 5](#phase-5-service-management) | [PHASE_5_SERVICE_MANAGEMENT_FRAMEWORK.md](phases/PHASE_5_SERVICE_MANAGEMENT_FRAMEWORK.md) | 📋 Planned | P2 |
| [Phase 5.5](#phase-55-app-management) | [PHASE_5.5_APP_MANAGEMENT.md](phases/PHASE_5.5_APP_MANAGEMENT.md) | 📋 Planned | P2 |
| [Phase 5.6](#phase-56-auth-bff-grpc) | [PHASE_5.6_AUTH_BFF_GRPC.md](phases/PHASE_5.6_AUTH_BFF_GRPC.md) | 📋 Planned | P2 |
| [Phase 6](#phase-6-analytics-dashboard) | [PHASE_6_ANALYTICS_DASHBOARD.md](phases/PHASE_6_ANALYTICS_DASHBOARD.md) | 📋 Planned | P3 |
| [Phase 7](#phase-7-audit-system) | [PHASE_7_AUDIT_SYSTEM.md](phases/PHASE_7_AUDIT_SYSTEM.md) | 📋 Planned | P3 |
| [Phase 8](#phase-8-notification-service) | [PHASE_8_NOTIFICATION_SERVICE.md](phases/PHASE_8_NOTIFICATION_SERVICE.md) | 📋 Planned | P3 |
| [Phase 9](#phase-9-settings-system-config) | [PHASE_9_SETTINGS_SYSTEM_CONFIG.md](phases/PHASE_9_SETTINGS_SYSTEM_CONFIG.md) | ✅ 75% Complete | P3 |
| [Phase 10](#phase-10-hr-code-removal--codebase-cleanup) | [PHASE_10_HR_CODE_REMOVAL.md](phases/PHASE_10_HR_CODE_REMOVAL.md) | ✅ Complete | P2 |

**Legend**: 📋 Planned | 🚧 In Progress | ✅ Complete | ⏸️ On Hold

---

## Execution Order & Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXECUTION TIMELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  PRIORITY 1: Foundation ✅ COMPLETED (2026-01-20)                            │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│  ✅ Phase 0 ──► ✅ Phase 1 ──► ✅ Phase 1.5 ──► ✅ Phase 2 ──► ✅ Phase 3    │
│       │              │                │              │              │        │
│       │              │                │              │              ▼        │
│       │              │                │              │         ✅ Post-3     │
│       │              │                │              │         (P1-P6)       │
│       │              │                │              │         3,779 logs    │
│       │              │                │              │              │        │
│       │              │                │              │              ▼        │
│       │              │                │              └──────► 📋 Phase 4     │
│       │              │                │                          │           │
│       └──────────────┴────────────────┴──────────────────────────┘           │
│    HR Structure   Code Refactor   Schema    Data     Admin   OTEL Pipeline  │
│                                                                              │
│  ✅ Phase 10 (HR Code Removal) - COMPLETED                                  │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  PRIORITY 2: Service Infrastructure                                          │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│                    ┌──────────────────────────────────────┐                  │
│                    │                                      │                  │
│  Phase 5 ──────────┼──► Phase 5.5 ──► Phase 5.6          │                  │
│     │              │       │              │               │                  │
│     │              │       │              └───────────────┤                  │
│     └──────────────┴───────┴─────────────────────────────┘                  │
│   Service Framework     App Mgmt      gRPC Mobile API                       │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  PRIORITY 3: Advanced Features (Can Run in Parallel)                         │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│  Phase 6 ─────────────────────────────────────────────────                  │
│  (Analytics Dashboard)                   │                                   │
│                                          │                                   │
│  Phase 7 ────────────────────────────────┼────────────────                  │
│  (Audit System)                          │                                   │
│                                          │                                   │
│  Phase 8 ────────────────────────────────┼────────────────                  │
│  (Notification)                          │                                   │
│                                          │                                   │
│  Phase 9 ────────────────────────────────┼────────────────                  │
│  (Settings - 75% Done)                   │                                   │
│                                          │                                   │
│  Phase 10 ───────────────────────────────┘                                  │
│  (HR Service Migration & Cleanup)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Documentation Summary

### Phase 0: HR Service Structure
**File**: [`phases/PHASE_0_HR_SERVICE_STRUCTURE.md`](phases/PHASE_0_HR_SERVICE_STRUCTURE.md)

| Item | Description |
|------|-------------|
| **Purpose** | HR 코드 구조를 별도 서비스로 백업 (구현 없음, DB 없음) |
| **Scope** | hr-service 폴더 구조 생성, README 작성, schema 구조만 정의 |
| **Output** | `services/hr-service/` 디렉토리 구조 |
| **PR Branch** | `feat/phase0-hr-service-structure` |
| **Dependencies** | None |
| **Estimated Effort** | 0.5 day |

**Key Tasks**:
- [x] Create hr-service folder structure
- [x] Create empty modules with README placeholders
- [x] Write schema.prisma (structure only, NO DB apply)
- [x] Document future migration plan

**Completed**: PR #584 (merged)

---

### Phase 1: Code Refactoring
**File**: [`phases/PHASE_1_CODE_REFACTORING.md`](phases/PHASE_1_CODE_REFACTORING.md)

| Item | Description |
|------|-------------|
| **Purpose** | web-admin 코드 정리 및 HR 메뉴 분리 |
| **Scope** | Menu config 정리, 라우터 정리, 번역 키 정리, 코드 분석 |
| **Output** | Clean codebase without HR menu items |
| **PR Branch** | `feat/phase1-code-refactoring` |
| **Dependencies** | Phase 0 |
| **Estimated Effort** | 1 day |

**Key Tasks**:
- [x] Remove HR menu from menu.config.ts
- [x] Remove /hr routes from router.tsx
- [ ] Remove HR translation keys (deferred - may reuse)
- [ ] Run code analysis (ts-prune, depcheck, madge) (optional)
- [x] Run eslint --fix, prettier --write

**Completed**: PR #585 (combined with Phase 1.5, 2)

---

### Phase 1.5: Global User Schema
**File**: [`phases/PHASE_1.5_GLOBAL_USER_SCHEMA.md`](phases/PHASE_1.5_GLOBAL_USER_SCHEMA.md)

| Item | Description |
|------|-------------|
| **Purpose** | identity_db.accounts 확장 설계 (SCIM 2.0, Universal Commerce) |
| **Scope** | 스키마 설계 문서, Prisma schema 구조, 마이그레이션 계획 |
| **Output** | Design documents, schema definitions |
| **PR Branch** | `docs/phase1.5-user-schema-design` |
| **Dependencies** | Phase 1 |
| **Estimated Effort** | 1 day |

**Key Contents**:
- SCIM 2.0 Core Schema (RFC 7643)
- Unified Customer Profile pattern
- Platform Extensions (JSONB): Commerce, Social, Chat, Blog
- Multi-tenant support (tenant_id, organization_id)
- Identity Resolution (linked_identities, device_fingerprints)

**Completed**: PR #585 (combined with Phase 1, 2)
- Created `docs/llm/policies/user-schema.md` (SSOT)
- Created `.ai/user-schema.md` (indicator)

---

### Phase 2: Data Cleanup Design
**File**: [`phases/PHASE_2_DATA_CLEANUP_DESIGN.md`](phases/PHASE_2_DATA_CLEANUP_DESIGN.md)

| Item | Description |
|------|-------------|
| **Purpose** | admins 테이블 정리 및 accounts 확장 마이그레이션 설계 |
| **Scope** | 데이터 마이그레이션 계획, FK 참조 정리 계획 |
| **Output** | Migration plan documents (no execution) |
| **PR Branch** | `docs/phase2-data-cleanup-design` |
| **Dependencies** | Phase 1.5 |
| **Estimated Effort** | 1 day |

**Key Contents**:
- admins table → System admin only
- HR data → identity_db.accounts (account_type: 'employee')
- FK reference cleanup plan
- Rollback strategy

**Completed**: PR #585 (combined with Phase 1, 1.5)
- Created `docs/llm/policies/data-migration.md` (SSOT)
- Created `.ai/data-migration.md` (indicator)
- Created `docs/migrations/drafts/*.sql` (design documents)

---

### Phase 3: Admin Account Management
**File**: [`phases/PHASE_3_ADMIN_ACCOUNT_MANAGEMENT.md`](phases/PHASE_3_ADMIN_ACCOUNT_MANAGEMENT.md)

| Item | Description |
|------|-------------|
| **Purpose** | System Admin 계정 CRUD 기능 구현 |
| **Scope** | Backend API, Frontend UI (System > Admin Accounts) |
| **Output** | Admin account management feature |
| **PR Branch** | `feat/phase3-admin-account` |
| **Dependencies** | Phase 2 |
| **Estimated Effort** | 3-4 days |

**Key Tasks**:
- [x] Backend: admin-account module in auth-service
- [x] Backend: CRUD API endpoints
- [x] Frontend: AdminAccountsPage, AdminDetailPage, AdminEditPage
- [x] Frontend: React 19 use() hook pattern migration
- [x] Event-based audit logging (Kafka producer)
- [x] Tests: 23 unit tests (service + controller)
- [x] CI/CD: All checks passing

**Completed**: PR #586 (ready to merge)

**API Endpoints**:
```
POST   /admin/admins
GET    /admin/admins
GET    /admin/admins/:id
PATCH  /admin/admins/:id
DELETE /admin/admins/:id
POST   /admin/admins/:id/invite
```

---

### Post-Phase 3: OTEL Observability Pipeline (6 Phases) ✅ COMPLETED

**Status**: ✅ All phases complete (2026-01-20)
**Architecture**: OpenTelemetry-based unified observability with audit compliance

| Phase | File | Status | Completed |
|-------|------|--------|-----------|
| P1: Audit Gateway | [`archived/POST_PHASE3_P1_AUDIT_GATEWAY.md`](archived/POST_PHASE3_P1_AUDIT_GATEWAY.md) | ✅ Complete | 2026-01-19 |
| P2: OTEL Collector | [`archived/POST_PHASE3_P2_OTEL_COLLECTOR.md`](archived/POST_PHASE3_P2_OTEL_COLLECTOR.md) | ✅ Complete | 2026-01-19 |
| P3: ClickHouse Kafka | [`archived/POST_PHASE3_P3_CLICKHOUSE_KAFKA.md`](archived/POST_PHASE3_P3_CLICKHOUSE_KAFKA.md) | ✅ Complete | 2026-01-20 |
| P4: Frontend SDK | [`archived/POST_PHASE3_P4_FRONTEND_SDK.md`](archived/POST_PHASE3_P4_FRONTEND_SDK.md) | ✅ Complete | 2026-01-19 |
| P5: Backend Instrumentation | [`archived/POST_PHASE3_P5_BACKEND_INSTRUMENTATION.md`](archived/POST_PHASE3_P5_BACKEND_INSTRUMENTATION.md) | ✅ Complete | 2026-01-19 |
| P6: OTLP JSON Parsing | docs/llm/tasks/POST_PHASE3_P6_OTLP_JSON_PARSING.md | ✅ Complete | 2026-01-20 |

**Total Actual Effort**: 2 days (2026-01-19 ~ 2026-01-20)

**Why OTEL Architecture?**:
- **2026 Industry Standard**: Vendor-neutral, mature ecosystem
- **Single Entry Point**: audit-service as secure gateway (OTEL Collector internal-only)
- **Unified Data Model**: Traces, metrics, logs with correlation (TraceId/SpanId)
- **Audit Compliance**: 7-year retention, delivery guarantees, PII redaction
- **Cost Optimization**: Centralized sampling, rate limiting, per-tenant tracking

**Production Architecture** (Implemented):
```
Services (audit, auth)
    ↓ HTTP/protobuf :4318
OTEL Collector (monitoring namespace)
    ↓ Internal: platform-redpanda.storage.svc.cluster.local:9093 (SASL)
Redpanda (storage namespace)
    - Internal listener: 9093 (headless service)
    - External listener: 9094 (LoadBalancer 192.168.1.253)
    ↓ External: kafka.girok.dev:9094 (SASL)
ClickHouse (bare metal 192.168.1.50)
    - Kafka Engine with JSONAsString format
    - Materialized Views with arrayFirst key-based extraction
    - NULL-safe parsing (toUInt8OrZero, coalesce)
    ↓
MergeTree Tables (audit_db_dev)
    - otel_audit_logs: 7-year retention
    - otel_audit_traces: 90-day retention
    - otel_audit_metrics: 1-year retention
```

**Production Metrics** (2026-01-20):
- ✅ 3,779 logs successfully stored
- ✅ 2 services tracked (audit-service, auth-service)
- ✅ 10 namespaces monitored
- ✅ 0 consumer lag (all partitions)
- ✅ Date range: 2026-01-19 15:19 ~ 2026-01-20 03:15

**Key Achievements**:
1. ✅ OTLP standard compliance (vendor-neutral)
2. ✅ Redpanda standard architecture (internal + external listeners)
3. ✅ OTEL Collector internal routing via headless service
4. ✅ ClickHouse external connection via LoadBalancer
5. ✅ Key-based attribute extraction (arrayFirst instead of positional)
6. ✅ Complete NULL-safe parsing for all OTLP fields
7. ✅ Kafka resilience with 0 consumer lag
8. ✅ Production data flow operational

**Technical Solutions**:
- Migration 007: JSONAsString + SASL authentication
- Migration 008: arrayFirst key-based attribute extraction
- Migration 009: NULL-safe severityNumber handling
- Migration 010: Complete NULL handling (observedTimeUnixNano, K8s attributes)

**Documentation**:
- my-girok: `docs/llm/tasks/POST_PHASE3_STATUS.md`
- my-girok: `docs/troubleshooting/otlp-clickhouse-parsing-issue.md`
- platform-gitops: `docs/llm/guides/otlp-kafka-pipeline.md`
- platform-gitops: `docs/llm/components/redpanda.md`

**References**:
- [OpenTelemetry Logging Best Practices | Dash0](https://www.dash0.com/knowledge/opentelemetry-logging-explained)
- [OTEL Collector Security | GitHub](https://github.com/open-telemetry/opentelemetry-collector/blob/main/docs/security-best-practices.md)
- [ClickHouse OTLP Integration | Docs](https://clickhouse.com/docs/observability/integrating-opentelemetry)
- [Altinity KB: JSONAsString Parser](https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/)

**Next Steps**:
1. Grafana dashboards for audit logs visualization
2. Alerting configuration for consumer lag
3. Trace visualization (Jaeger or Grafana Tempo)
4. Service-level metrics dashboards
5. Query patterns documentation for audit compliance

---

### Phase 3-4: Permission Analysis
**File**: [`phases/PHASE_3_4_PERMISSION_ANALYSIS.md`](phases/PHASE_3_4_PERMISSION_ANALYSIS.md)

| Item | Description |
|------|-------------|
| **Purpose** | Phase 3, 4 간의 경계 분석 및 권한 시스템 현황 분석 |
| **Type** | Reference Document (Not Implementation) |

**Key Contents**:
- Current permission system architecture
- Menu-level permission matrix (24 items)
- Permission inheritance rules
- Phase 3 (WHO) vs Phase 4 (WHAT) boundary

---

### Phase 4: Permission Management
**File**: [`phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md`](phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md)

| Item | Description |
|------|-------------|
| **Purpose** | OpenFGA 모델 확장 및 권한 관리 UI 구현 |
| **Scope** | OpenFGA DSL 확장, 권한 API, Permission Management UI |
| **Output** | Extended authorization system |
| **PR Branch** | `feat/phase4-permission-system` |
| **Dependencies** | Phase 3 |
| **Estimated Effort** | 4-5 days |

**OpenFGA Model Extensions**:
```yaml
type department
  relations
    define head: [admin]
    define manager: [admin]
    define member: [admin, department#member]

type menu_item
  relations
    define allowed_admin: [admin]
    define allowed_role: [role#assigned]

type role
  relations
    define assigned: [admin]
    define parent_role: [role]
```

**Frontend Pages**:
- PermissionsPage with Admin/Team/Menu tabs
- Permission templates management
- Bulk permission operations

---

### Phase 5: Service Management
**File**: [`phases/PHASE_5_SERVICE_MANAGEMENT_FRAMEWORK.md`](phases/PHASE_5_SERVICE_MANAGEMENT_FRAMEWORK.md)

| Item | Description |
|------|-------------|
| **Purpose** | Service/App 통합 관리 프레임워크 구현 |
| **Scope** | Service Registry, [appId] 동적 라우팅, 공통 레이아웃 |
| **Output** | Service management infrastructure |
| **PR Branch** | `feat/phase5-service-management` |
| **Dependencies** | Phase 4 |
| **Estimated Effort** | 5-7 days |

**Key Features**:
- Service Registry (Web + Mobile apps)
- `[appId]` dynamic routing with ServiceLayout
- Service Dashboard with KPIs
- Feature Flags management
- Maintenance Mode control
- Session Management

**Database Tables**:
```
app_registry          # App/Service registration
app_versions          # Version history
feature_flags         # Feature toggle definitions
remote_configs        # Dynamic configuration
maintenance_schedules # Maintenance windows
```

---

### Phase 5.5: App Management
**File**: [`phases/PHASE_5.5_APP_MANAGEMENT.md`](phases/PHASE_5.5_APP_MANAGEMENT.md)

| Item | Description |
|------|-------------|
| **Purpose** | 모바일 앱 전용 관리 기능 (버전, 강제 업데이트, 광고) |
| **Scope** | Version Control, Force Update, Ad Management, Push Campaigns |
| **Output** | Mobile app management features |
| **PR Branch** | `feat/phase5.5-app-management` |
| **Dependencies** | Phase 5 |
| **Estimated Effort** | 4-5 days |

**Key Features**:
- App Version Module (version history, release notes)
- Force Update Policy (soft/hard update, grace period)
- Ad Management (placements, ad-free rules)
- Push Notification Campaigns (segmentation, A/B testing)

**API Endpoints**:
```
GET/POST   /admin/apps/:appId/versions
POST       /admin/apps/:appId/force-update-policy
GET/POST   /admin/apps/:appId/ads
POST       /admin/apps/:appId/push-campaigns
```

---

### Phase 5.6: auth-bff gRPC
**File**: [`phases/PHASE_5.6_AUTH_BFF_GRPC.md`](phases/PHASE_5.6_AUTH_BFF_GRPC.md)

| Item | Description |
|------|-------------|
| **Purpose** | 모바일 앱용 gRPC API 레이어 구현 |
| **Scope** | Proto 정의, gRPC Services, Guards/Interceptors |
| **Output** | gRPC communication layer for mobile apps |
| **PR Branch** | `feat/phase5.6-auth-bff-grpc` |
| **Dependencies** | Phase 5.5 |
| **Estimated Effort** | 4-5 days |

**Proto Files**:
```
packages/proto/app/v1/
├── app_check.proto     # Version check, integrity validation
├── app_session.proto   # Session lifecycle
└── app_config.proto    # Feature flags, remote config
```

**gRPC Services**:
- AppCheckService: Version validation, force update check
- AppSessionService: Session CRUD, analytics
- AppConfigService: Feature flags, remote config, maintenance

**Guards & Interceptors**:
- AppVersionGuard: Block outdated app versions
- ForceUpdateInterceptor: Add update headers
- MaintenanceGuard: Block during maintenance

---

### Phase 6: Analytics Dashboard
**File**: [`phases/PHASE_6_ANALYTICS_DASHBOARD.md`](phases/PHASE_6_ANALYTICS_DASHBOARD.md)

| Item | Description |
|------|-------------|
| **Purpose** | 공통 대시보드 모듈 및 Custom Query Builder 구현 |
| **Scope** | Dashboard components, ClickHouse query execution, Saved queries |
| **Output** | Reusable dashboard infrastructure |
| **PR Branch** | `feat/phase6-dashboard` |
| **Dependencies** | Phase 5 |
| **Estimated Effort** | 5-7 days |

**Common Module** (`packages/dashboard-components/`):
```
├── widgets/
│   ├── ChartWidget (Line, Bar, Area, Pie)
│   ├── KPIWidget
│   ├── TableWidget
│   ├── HeatmapWidget
│   └── FunnelWidget
├── hooks/
│   ├── useDashboardQuery
│   ├── useChartData
│   └── useRealTimeData
├── layout/
│   ├── DashboardGrid (react-grid-layout)
│   └── WidgetContainer
└── query/
    ├── QueryEditor (Monaco)
    └── QueryVariables
```

**Custom Query Features**:
- Monaco Editor with ClickHouse syntax
- SQL Injection prevention (whitelist patterns)
- Parameterized queries with variables
- Saved query management
- Query execution logging

---

### Phase 7: Audit System
**File**: [`phases/PHASE_7_AUDIT_SYSTEM.md`](phases/PHASE_7_AUDIT_SYSTEM.md)

| Item | Description |
|------|-------------|
| **Purpose** | Rybbit 기반 세션 레코딩 및 분석 기능 확장 |
| **Scope** | Heatmaps, Path Analysis, Web Vitals, Goals |
| **Output** | Enhanced audit and analytics features |
| **PR Branch** | `feat/phase7-audit-system` |
| **Dependencies** | Phase 6 |
| **Estimated Effort** | 5-7 days |

**Rybbit Features Applied**:
| Feature | Priority | Description |
|---------|----------|-------------|
| Session Replay | High | Enhanced rrweb with privacy masking |
| Click Heatmaps | High | Click position tracking |
| Scroll Heatmaps | Medium | Scroll depth analysis |
| Path Analysis | High | User journey visualization (Sankey) |
| Web Vitals | Medium | LCP, INP, CLS, FCP, TTFB |
| Goal Conversion | High | Custom conversion tracking |

**New ClickHouse Tables**:
```
audit_db.heatmap_events      # Click, scroll, attention data
audit_db.path_events         # Page navigation flow
audit_db.web_vitals          # Core Web Vitals metrics
audit_db.goal_conversions    # Goal completion tracking
audit_db.behavior_trends     # Hourly aggregations
```

---

### Phase 8: Notification Service
**File**: [`phases/PHASE_8_NOTIFICATION_SERVICE.md`](phases/PHASE_8_NOTIFICATION_SERVICE.md)

| Item | Description |
|------|-------------|
| **Purpose** | 알림 발송 인프라 및 메일 서비스 DB 설계 |
| **Scope** | Email/Push/In-App 발송, Mail DB schema (수신용) |
| **Output** | Notification infrastructure |
| **PR Branch** | `feat/phase8-notification-service` |
| **Dependencies** | Kafka/Redpanda infrastructure |
| **Estimated Effort** | 7-10 days |

**Sending Infrastructure**:
```
notification-service/
├── channels/
│   ├── email/ (SMTP, SendGrid, SES)
│   ├── push/ (FCM, APNs)
│   ├── sms/ (Twilio)
│   └── in-app/ (WebSocket)
├── templates/ (MJML)
├── dispatcher/
└── queue/ (BullMQ processors)
```

**Mail Service DB (Receiving)**:
```sql
mailboxes         # User mailbox settings (5GB quota)
folders           # Inbox, Sent, Drafts, Trash, Custom
messages          # Email content + Full-Text Search
attachments       # S3/GCS storage
threads           # Conversation grouping
labels            # Custom labels
contacts          # Address book
mail_rules        # Filtering rules
mail_outbox       # Transactional Outbox pattern
mail_events       # Webhooks (bounce, delivery, open)
```

---

### Phase 9: Settings & System Config
**File**: [`phases/PHASE_9_SETTINGS_SYSTEM_CONFIG.md`](phases/PHASE_9_SETTINGS_SYSTEM_CONFIG.md)

| Item | Description |
|------|-------------|
| **Purpose** | 시스템 설정 현황 분석 및 미구현 기능 정리 |
| **Status** | **75% Complete** (Backend done, Frontend partial) |
| **Output** | Remaining frontend pages |
| **PR Branch** | `feat/phase9-settings-frontend` |
| **Dependencies** | None |
| **Estimated Effort** | 5-7 days |

**Implementation Status**:
| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Countries/Locales | auth-service | web-admin | **Complete** |
| OAuth Config | auth-service | web-admin | **Complete** |
| Service Config | auth-service | - | Backend only |
| Service Features | auth-service | - | Backend only |
| Country Config | auth-service | - | Backend only |
| Audit Logs | audit-service | web-admin | **Complete** |

**Remaining Tasks**:
- [ ] Service Configuration Page (frontend)
- [ ] Service Features Page (frontend)
- [ ] Country Configuration Page (frontend)

---

### Phase 10: HR Code Removal & Codebase Cleanup
**File**: [`phases/PHASE_10_HR_CODE_REMOVAL.md`](phases/PHASE_10_HR_CODE_REMOVAL.md)

| Item | Description |
|------|-------------|
| **Purpose** | Remove all HR implementation code from codebase, keep hr-service as structural backup |
| **Scope** | Code deletion, Code cleanup, Dead code removal |
| **Output** | Zero HR code in auth-service & packages/types, Clean codebase |
| **PR Branch** | `feat/phase10-hr-code-removal` |
| **Dependencies** | Phase 3 |
| **Estimated Effort** | 3-4 days |

**Key Tasks**:
- Delete 52 HR files from auth-service
- Delete 8 HR type files from packages/types
- Create backup before deletion
- Remove HR imports from app.module.ts and index.ts
- Run codebase cleanup (ts-prune, depcheck, madge)
- Update documentation

**Files to Delete (60 total)**:
```
auth-service:
├── attendance/    (7 files + tests)
├── leave/         (7 files + tests)
├── delegation/    (4 files + tests)
└── employee/      (25 files + tests)

packages/types:
├── hr-employee.types.ts & schemas.ts
├── hr-attendance.types.ts & schemas.ts
├── hr-leave.types.ts & schemas.ts
└── hr-delegation.types.ts & schemas.ts
```

**What Stays (No Changes)**:
- ✅ hr-service structure (Phase 0 backup)
- ✅ auth_db HR tables (17 tables for historical reference)
- ✅ web-admin HR pages (for Phase 5 Services framework)

**Important**: hr-service is a backup before domain separation, NOT an implementation.
No database migration, no hr_db creation, no data movement.

---

## How to Use This Document

### 1. Starting a New Phase

```bash
# 1. Read the phase document
cat .tasks/phases/PHASE_X_*.md

# 2. Create feature branch
git checkout -b feat/phaseX-feature-name

# 3. Follow the tasks in the document
# Each document contains:
# - Detailed task list
# - File paths to create/modify
# - API endpoint definitions
# - Database schema
# - Verification checklist

# 4. Run tests and create PR
pnpm test
gh pr create --title "feat(phaseX): Feature name"
```

### 2. Document Structure

Each phase document follows this structure:

```markdown
# Phase X: Title

> Objective, Dependencies, Status

## Overview
Brief description and goals

## Architecture
System diagrams and data flow

## Database Schema
SQL/Prisma definitions

## Backend Implementation
- Controllers
- Services
- DTOs
- Tests

## Frontend Implementation
- Pages
- Components
- API clients

## API Endpoints
Endpoint table with methods and descriptions

## Verification Checklist
[ ] Task 1
[ ] Task 2
...
```

### 3. Progress Tracking

Update this file as phases complete:

```markdown
| Phase | Status |
|-------|--------|
| Phase 0 | ✅ Complete |
| Phase 1 | 🚧 In Progress |
| Phase 2 | 📋 Planned |
```

---

## Database Migration Policy Summary

**CRITICAL**: All database schema changes MUST use goose migrations.

| Phase | Migration Required | Type | Database |
|-------|-------------------|------|----------|
| Phase 0 | ❌ NO | - | None (structure only) |
| Phase 1 | ❌ NO | - | None (code cleanup) |
| Phase 1.5 | ❌ NO | - | None (design doc) |
| Phase 2 | ❌ NO | - | None (design doc) |
| **Phase 3** | **❌ NO** | - | Uses existing tables |
| **Phase 4** | **⚠️ OpenFGA DSL** | Model Update | authorization_db |
| **Phase 5** | **✅ YES** | goose | auth_db (app_registry, app_versions, remote_configs, maintenance_schedules) |
| **Phase 5.5** | **✅ YES** | goose | auth_db (extends Phase 5 tables) |
| **Phase 5.6** | **❌ NO** | - | gRPC only |
| **Phase 6** | **✅ YES** | goose | analytics_db (saved_queries, dashboard_configs) |
| **Phase 7** | **✅ YES** | goose | audit_db ClickHouse (heatmap_events, path_events, web_vitals, goal_conversions) |
| **Phase 8** | **✅ YES** | goose | New mail_db (mailboxes, messages, folders, attachments, contacts) |
| **Phase 9** | **❌ NO** | - | Frontend only |
| **Phase 10** | **❌ NO** | - | Code removal only (HR tables stay in auth_db) |

### Migration Commands

```bash
# Create migration
goose -dir services/{service}/migrations create description_here sql

# Test locally
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" down

# Sync Prisma (after migration)
pnpm --filter {service} prisma db pull
pnpm --filter {service} prisma generate
```

### Migration Template

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS table_name (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
CREATE INDEX idx_table_field ON table_name(field);

-- +goose Down
DROP TABLE IF EXISTS table_name;
```

**Policy References**:
- Quick Guide: `.ai/database.md`
- Full Policy: `docs/llm/policies/database.md`
- Strategy: `docs/llm/policies/database-migration-strategy.md`
- Troubleshooting: `docs/llm/guides/migration-troubleshooting.md`

---

## PR Workflow

### Branch Naming Convention

```
feat/phase0-hr-service-structure
feat/phase1-code-refactoring
docs/phase1.5-user-schema-design
docs/phase2-data-cleanup-design
feat/phase3-admin-account
feat/phase4-permission-system
feat/phase5-service-management
feat/phase5.5-app-management
feat/phase5.6-auth-bff-grpc
feat/phase6-dashboard
feat/phase7-audit-system
feat/phase8-notification-service
feat/phase9-settings-frontend
feat/phase10-hr-service-migration
```

### PR Checklist

```markdown
## PR Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated (80% coverage)
- [ ] Documentation updated (.ai/, docs/llm/)
- [ ] No console.log or debug code
- [ ] All TODOs resolved or documented
- [ ] **Database migrations verified (if applicable)**
  - [ ] Created goose migration file (YYYYMMDDHHMMSS_description.sql)
  - [ ] Includes `-- +goose Up` and `-- +goose Down` sections
  - [ ] Tested migration up/down locally
  - [ ] Updated Prisma schema (if needed)
  - [ ] Ran `pnpm prisma generate` after migration
  - [ ] See: `.ai/database.md` and `docs/llm/policies/database.md`
- [ ] API endpoints documented
```

### Documentation Update Rules

```
After each Phase:
├── .ai/ (Indicator, 30-50 lines)
│   ├── services/*.md (if service added)
│   └── architecture.md (if needed)
│
└── docs/llm/ (SSOT, detailed)
    ├── services/*.md
    └── policies/*.md (if needed)

NEVER edit:
├── docs/en/* (auto-generated)
└── docs/kr/* (auto-translated)
```

---

## File Index

```
.tasks/
├── MASTER_PROJECT_PLAN.md          # This file - Navigation & Overview
├── WEB_ADMIN_REFACTORING.md        # Original master plan (reference)
│
└── phases/
    ├── PHASE_0_HR_SERVICE_STRUCTURE.md
    ├── PHASE_1_CODE_REFACTORING.md
    ├── PHASE_1.5_GLOBAL_USER_SCHEMA.md
    ├── PHASE_2_DATA_CLEANUP_DESIGN.md
    ├── PHASE_3_ADMIN_ACCOUNT_MANAGEMENT.md
    ├── PHASE_3_4_PERMISSION_ANALYSIS.md    # Reference doc
    ├── PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md
    ├── PHASE_5_SERVICE_MANAGEMENT_FRAMEWORK.md
    ├── PHASE_5.5_APP_MANAGEMENT.md
    ├── PHASE_5.6_AUTH_BFF_GRPC.md
    ├── PHASE_6_ANALYTICS_DASHBOARD.md
    ├── PHASE_7_AUDIT_SYSTEM.md
    ├── PHASE_8_NOTIFICATION_SERVICE.md
    ├── PHASE_9_SETTINGS_SYSTEM_CONFIG.md
    └── PHASE_10_HR_SERVICE_MIGRATION.md
```

---

## Estimated Timeline

| Priority | Phases | Estimated Effort |
|----------|--------|------------------|
| P1 (Foundation) | Phase 0-4 | 10-12 days |
| P2 (Service Infra) | Phase 5-5.6, 10 | 20-27 days |
| P3 (Advanced) | Phase 6-9 | 22-31 days |
| **Total** | | **52-70 days** |

**Note**: Phases 6-9 can run in parallel to reduce total time.

---

## References

### Project Policies
- `.ai/rules.md` - Core development rules
- `.ai/architecture.md` - Architecture patterns
- `docs/llm/policies/identity-platform.md` - Identity platform policy
- `docs/llm/policies/authorization.md` - Authorization policy
- `docs/llm/policies/database.md` - Database policy

### External Standards
- [SCIM 2.0 Core Schema (RFC 7643)](https://datatracker.ietf.org/doc/html/rfc7643)
- [OpenFGA Authorization](https://openfga.dev/docs)
- [Rybbit Analytics](https://github.com/rybbit-io/rybbit)
- [ClickHouse Documentation](https://clickhouse.com/docs)

---

**Last Updated**: 2026-01-18
**Status**: Ready for Implementation
