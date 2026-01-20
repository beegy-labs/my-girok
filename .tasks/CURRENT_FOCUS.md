# Current Focus

> **Last Updated**: 2026-01-20
> **Status**: Web-Admin Recovery - Phase 4 Permission Management

---

## ✅ Recently Completed

### OTEL Pipeline for Audit Service (2026-01-19 ~ 2026-01-20)
- **목적**: Audit 서비스를 위한 데이터 수집 파이프라인 구축
- **결과**: ClickHouse에 3,779 로그 정상 저장, 0 consumer lag
- **상태**: ✅ 완료 - 정상 작동 중
- **Phases**: Post-Phase 3 P1-P6 전체 완료
  - P1: Audit Service Telemetry Gateway
  - P2: OTEL Collector Configuration
  - P3: ClickHouse Kafka Engine Integration
  - P4: Frontend SDK Integration
  - P5: Backend Instrumentation
  - P6: OTLP JSON Parsing (arrayFirst + NULL-safe)

### Web-Admin 기본 기능 (Phase 0-3, 10)
- ✅ Phase 3: Admin Account Management (관리자 CRUD)
- ✅ Phase 10: HR Code Removal
- ✅ Settings: Countries, Locales, OAuth, Tenant, Audit, Sessions

---

## 🎯 Next Priority Task

### 1. Phase 4: Permission Management System (P1 - High) ⚡

**Why Important**: web-admin 복구 핵심 - 관리자 권한 차등화 필요

**Current Problem**:
- 모든 관리자가 동일 권한 (슈퍼관리자)
- 메뉴별 접근 제어 불가능
- 역할 기반 권한 관리 필요

**Scope**:
- OpenFGA 모델 확장 (department, menu_item, role)
- PermissionsPage UI (Admin/Team/Menu 탭)
- 권한 템플릿 관리
- 메뉴별 접근 제어 Guard

**Estimated Effort**: 4-5일

**Documentation**: `.tasks/phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md`

**Dependencies**: Phase 3 ✅ (Complete)

**PR Branch**: `feat/phase4-permission-management`

**Implementation Steps**:
1. Review OpenFGA current model
2. Design extended model (department, menu_item, role)
3. Create PermissionsPage component structure
4. Implement Admin permissions tab
5. Implement Team permissions tab
6. Implement Menu permissions tab
7. Add permission templates
8. Create access control guards
9. Test permission enforcement
10. Update menu rendering logic

**Technical Details**:
- Authorization: OpenFGA
- Backend: auth-service/authorization-service
- Frontend: web-admin/src/pages/permissions
- Database: authorization_db (OpenFGA DSL update)
- Dependencies: Phase 3 Admin Account Management ✅

---

## 📊 Progress Overview

### Completed Phases (14)
1. ✅ Phase 0-3, 10: HR 제거 및 Admin Management
2. ✅ Post-Phase 3 (P1-P6): OTEL Pipeline for Audit Service
   - 목적: Audit 서비스 데이터 수집
   - 상태: 3,779 로그 정상 저장 중

### Next Phases - Web-Admin 복구
- 📋 Phase 4: Permission Management (P1) ⚡ **← YOU ARE HERE**
- 📋 Phase 8: Notification Service (P2, 선택적)
- 📋 Phase 9 완성: Settings UI (P3, 선택적)

### 제외 Phases (현재 불필요)
- ❌ Phase 5: Service Management (서비스 수 적음)
- ❌ Phase 5.5: App Management (모바일 앱 없음)
- ❌ Phase 5.6: auth-bff gRPC (모바일 앱 없음)
- ❌ Phase 6: Analytics Dashboard (Grafana로 대체)
- ❌ Phase 7: Audit System 고도화 (서드파티로 대체)

---

## 🚀 Start Now

**Recommended Command**:
```bash
# Read implementation plan
cat .tasks/phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md

# Create feature branch
git checkout develop
git pull
git checkout -b feat/phase4-permission-management

# Review OpenFGA model
cd services/authorization-service
```

**Why Start Now?**:
- ⚡ P1 High priority - web-admin 복구 핵심
- 🔒 권한 차등화 필수 기능
- 📊 메뉴별 접근 제어 필요
- ⏱️ 4-5일 작업량

---

## 📋 선택적 작업 (After Phase 4)

### Phase 8: Notification Service (기본 버전)
- **Estimated**: 3-4일
- **Scope**: SendGrid/AWS SES 연동, 관리자 초대 이메일, 비밀번호 재설정
- **필요성**: 중간 (필요하면 기본 기능만)

### Phase 9 완성: Settings UI
- **Estimated**: 2-3일
- **Scope**: Service Config, Service Features, Country Config 프론트엔드
- **필요성**: 낮음 (백엔드 완료, 프론트엔드 선택적)

---

## 📚 References

- **Web-Admin 복구 계획**: `.tasks/WEB_ADMIN_RECOVERY_PLAN.md`
- **Phase 4 상세**: `.tasks/phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md`
- **Progress Tracker**: `.tasks/PROGRESS.md`
- **Master Plan**: `.tasks/MASTER_PROJECT_PLAN.md`
- **Git Flow**: `.ai/git-flow.md`
