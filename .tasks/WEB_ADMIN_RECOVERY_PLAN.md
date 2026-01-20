# Web-Admin 복구 작업 계획

> **목적**: HR 코드 제거 후 web-admin 기능 복구 및 완성
> **작성일**: 2026-01-20
> **우선순위**: P1 (High)

---

## 📊 현재 상태

### ✅ 완료된 작업
1. ✅ Phase 0-3: HR 코드 제거 및 Admin Account Management
2. ✅ Phase 10: HR 코드 완전 제거
3. ✅ Post-Phase 3 (P1-P6): OTEL 파이프라인 구축
   - **목적**: Audit 서비스를 위한 데이터 수집
   - **결과**: ClickHouse에 3,779 로그 저장 중
   - **상태**: 정상 작동 (0 consumer lag)

### ⚠️ 미완성 작업
- Phase 4: Permission Management (권한 관리)
- Phase 8: Notification Service (알림 시스템)
- Phase 9: Settings 프론트엔드 일부

---

## 🎯 Web-Admin 복구 우선순위

### Priority 1: Permission Management (필수)
**Phase 4: Permission Management System**
- **작업량**: 4-5일
- **의존성**: Phase 3 완료 ✅
- **상태**: 📋 Ready to Start

**필요성**:
- 현재 모든 관리자가 동일 권한 (슈퍼관리자)
- 메뉴별 접근 제어 불가능
- 관리자 역할 차등화 필요

**작업 내용**:
1. OpenFGA 모델 확장
   - department, menu_item, role 타입 추가
   - 계층형 권한 구조
2. 권한 관리 UI
   - PermissionsPage (Admin/Team/Menu 탭)
   - 권한 템플릿 관리
   - 벌크 권한 할당
3. 메뉴별 접근 제어
   - 권한 기반 메뉴 표시/숨김
   - 페이지 접근 Guard

**산출물**:
- OpenFGA DSL 업데이트
- PermissionsPage 컴포넌트
- 권한 API 클라이언트
- 접근 제어 로직

---

### Priority 2: Notification Service (선택적)
**Phase 8: Notification Service (기본 버전)**
- **작업량**: 3-4일 (전체 구현 7-10일 중 기본만)
- **의존성**: Kafka/Redpanda ✅
- **상태**: 📋 Optional

**필요성**:
- 관리자 초대 이메일
- 비밀번호 재설정 알림
- 시스템 알림

**작업 내용** (간소화 버전):
1. 이메일 발송 기본 기능
   - SendGrid/AWS SES 연동
   - 템플릿 시스템 (기본)
2. 필수 이메일만 구현
   - 관리자 초대
   - 비밀번호 재설정
   - 시스템 알림
3. Kafka 이벤트 기반 발송
   - admin.invited 이벤트 → 이메일
   - password.reset 이벤트 → 이메일

**제외** (나중에 추가):
- Push notification
- SMS
- In-App notification
- Mail receiving (inbox)
- MJML 고급 템플릿

**산출물**:
- notification-service (새 서비스 또는 audit-service 모듈)
- 이메일 템플릿 (기본)
- Kafka consumer (이벤트 → 이메일)

---

### Priority 3: Settings 프론트엔드 완성 (선택적)
**Phase 9: Settings UI 완성**
- **작업량**: 2-3일
- **의존성**: 없음 (백엔드 완료됨)
- **상태**: 📋 Optional

**작업 내용**:
1. Service Configuration Page
   - 서비스별 설정 CRUD
   - 현재 ServiceConfigTab 완성
2. Service Features Page
   - Feature toggle 관리
   - 권한 기반 기능 제어
3. Country Config Page (Employment)
   - 국가별 고용 규정 설정
   - 근무시간, 휴가 정책

**필요성 평가**:
- Service Config: 낮음 (환경변수로 관리 가능)
- Service Features: 중간 (LaunchDarkly 대체 가능)
- Country Config: 낮음 (HR 제거로 사용 안 함)

**권장**: 스킵 또는 나중에

---

## 🚀 작업 순서 (확정)

### 완전 복구: Phase 4 + Phase 8 (9-12일)

**Week 1 (5-6일)**:
- Phase 4 Backend (OpenFGA + API) - 2-3일
- Phase 8 Infrastructure (Email + Kafka) - 3일

**Week 2 (4-5일)**:
- Phase 4 Frontend (UI + Guards) - 3일
- Phase 8 완성 (테스트 + 배포) - 2일

**Week 3 (2일)**:
- Phase 4 테스트 + 문서화 - 1일
- 통합 검증 + 배포 - 1일

**체크리스트**: `.tasks/PHASE4_PHASE8_CHECKLIST.md`

---

## 📝 제외 작업 (현재 불필요)

### ❌ Phase 5: Service Management
**이유**:
- 서비스 수가 적음 (audit, auth, authorization, identity, personal)
- 동적 라우팅 불필요
- Feature Flags는 서드파티로 대체 가능

### ❌ Phase 5.5: App Management
**이유**: 모바일 앱이 아직 없음

### ❌ Phase 5.6: auth-bff gRPC
**이유**: 모바일 앱이 아직 없음

### ❌ Phase 6: Analytics Dashboard
**이유**:
- ClickHouse 데이터는 Audit 서비스용
- Grafana로 대체 가능
- 커스텀 대시보드 불필요

### ❌ Phase 7: Audit System 고도화
**이유**:
- Session recordings 이미 있음
- Heatmap, Path analysis는 Hotjar 등 서드파티로 대체

### ❌ Observability Visualization (Grafana)
**이유**:
- OTEL 데이터는 Audit 서비스를 위한 것
- 시각화 필요하면 나중에 추가
- 현재 우선순위 아님

---

## 🎯 다음 단계

### 1단계: 작업 결정
- [ ] Option 1, 2, 3 중 선택
- [ ] Phase 8 (Notification) 필요 여부 결정
- [ ] Phase 9 (Settings) 필요 여부 결정

### 2단계: Phase 4 시작
- [ ] `.tasks/phases/PHASE_4_PERMISSION_MANAGEMENT_SYSTEM.md` 읽기
- [ ] OpenFGA 모델 설계
- [ ] 브랜치 생성: `feat/phase4-permission-management`
- [ ] 작업 시작

### 3단계: (선택) Phase 8 시작
- [ ] Notification 서비스 위치 결정 (새 서비스 vs audit-service 모듈)
- [ ] SendGrid/AWS SES 선택
- [ ] 브랜치 생성: `feat/phase8-notification-basic`
- [ ] 작업 시작

---

## 📌 핵심 정리

**web-admin 복구 핵심**:
- Phase 4 (Permission Management)만 완료하면 기본 기능 완성
- Phase 8 (Notification)은 선택적 (필요하면 기본 버전만)
- Phase 9는 필요성 낮음 (스킵 권장)

**OTEL 파이프라인**:
- ✅ Audit 서비스를 위한 데이터 수집 목적
- ✅ ClickHouse에 정상적으로 데이터 저장 중
- ✅ 수정 불필요

**불필요 작업**:
- Phase 5, 5.5, 5.6, 7은 현재 필요 없음
- Grafana 대시보드는 나중에
- Analytics는 필요하면 나중에

**권장 사항**: Phase 4부터 시작
