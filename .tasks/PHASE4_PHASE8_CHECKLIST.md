# Phase 4 + Phase 8 작업 체크리스트

> **목적**: web-admin 복구 필수 작업
> **작업 기간**: 9-12일 (효율적 진행 시)
> **우선순위**: P1 (High)

---

## Phase 4: Permission Management System (4-5일)

### Step 1: OpenFGA 모델 확장
- [ ] department 타입 추가
- [ ] menu_item 타입 추가
- [ ] role 타입 확장
- [ ] resource_permission 타입 추가
- [ ] authorization.fga 파일 작성
- [ ] 모델 마이그레이션 적용

### Step 2: Backend API
- [ ] PermissionService 생성
- [ ] PermissionController 생성
- [ ] DTO 정의
- [ ] 권한 템플릿 시스템
- [ ] 벌크 권한 할당 API
- [ ] 권한 조회 API

### Step 3: Frontend - Permissions 페이지
- [ ] PermissionsPage 컴포넌트
- [ ] Admin Permissions Tab
- [ ] Team Permissions Tab
- [ ] Menu Permissions Tab
- [ ] Permission Templates UI
- [ ] Bulk assignment UI

### Step 4: 메뉴 접근 제어
- [ ] useMenuPermissions 훅
- [ ] menu.config.ts 권한 정보
- [ ] MenuGuard 컴포넌트
- [ ] 권한 기반 메뉴 필터링
- [ ] 403 페이지

### Step 5: 권한 체크 Guard
- [ ] PermissionGuard 클래스
- [ ] @RequirePermission 데코레이터
- [ ] auth-bff 권한 체크
- [ ] 페이지별 권한 요구사항

### Step 6: 테스트
- [ ] PermissionService 테스트
- [ ] PermissionController 테스트
- [ ] OpenFGA 모델 테스트
- [ ] Frontend 테스트
- [ ] E2E 테스트

### Step 7: 문서화 및 배포
- [ ] API 문서
- [ ] 사용자 가이드
- [ ] PR 생성
- [ ] dev 배포

---

## Phase 8: Notification Service (기본 버전, 3-4일)

### Step 1: 서비스 구조
- [ ] notification-service 생성 (또는 audit-service 모듈)
- [ ] NestJS 초기화
- [ ] 환경 변수 설정
- [ ] Kafka consumer 설정

### Step 2: 이메일 발송 인프라
- [ ] SendGrid/AWS SES 계정
- [ ] EmailService 생성
- [ ] 템플릿 엔진 설정
- [ ] 기본 HTML 템플릿

### Step 3: 이메일 템플릿
- [ ] admin-invitation.hbs
- [ ] password-reset.hbs
- [ ] system-notification.hbs
- [ ] 템플릿 렌더링 서비스

### Step 4: Kafka Consumer
- [ ] admin.invited consumer
- [ ] password.reset.requested consumer
- [ ] system.notification consumer
- [ ] 이벤트 매핑 로직

### Step 5: auth-service Producer
- [ ] AdminAccountService Kafka producer
- [ ] admin.invited 이벤트 발행
- [ ] password.reset.requested 이벤트 발행

### Step 6: 테스트
- [ ] EmailService 테스트
- [ ] 템플릿 렌더링 테스트
- [ ] Kafka consumer 테스트
- [ ] E2E 이메일 발송 테스트

### Step 7: 배포
- [ ] Helm chart
- [ ] ConfigMap/Secret
- [ ] 재시도 로직
- [ ] 발송 로그 및 모니터링

---

## 작업 순서

### Week 1 (5-6일)
**Phase 4 Backend + Phase 8 Infrastructure**
- Day 1-2: OpenFGA 모델 + Backend API
- Day 3-4: Email Service + Kafka
- Day 5-6: Kafka Producer + 템플릿

### Week 2 (4-5일)
**Phase 4 Frontend + Phase 8 완성**
- Day 1-3: Permissions UI + Guards
- Day 4-5: Phase 8 테스트 + 배포

### Week 3 (2일)
**테스트 및 검증**
- Day 1: Phase 4 테스트 + 문서화
- Day 2: 통합 검증 + 배포

---

## 총 작업량

- Phase 4: 35개 작업
- Phase 8: 28개 작업
- 총 63개 작업, 예상 9-12일
