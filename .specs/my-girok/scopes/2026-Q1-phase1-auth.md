# Scope: 2026-Q1 Phase 1 - Authentication

> L2: Human approval required | 로그인/회원가입 정상화

## Target

my-girok 서비스를 Identity Platform에 등록하고 로그인/회원가입 기능을 정상화

## Period

2026-01-28 ~ 2026-02-10 (2주)

## Items

| Priority | Feature                        | Status |
| -------- | ------------------------------ | ------ |
| P0       | Service Registration           | ⏳     |
| P0       | Authentication Integration     | ⏳     |
| P0       | Domain-Based Service Detection | ⏳     |
| P0       | JWT with Services Array        | ⏳     |
| P0       | Admin Service Management UI    | ⏳     |

## Success Criteria

### Core Authentication (Must Have)

- [ ] my-girok 서비스가 auth_db에 등록됨
- [ ] Service config 설정 완료 (JWT, domain validation, rate limits)
- [ ] Countries 설정 (KR, US, JP)
- [ ] Locales 설정 (ko, en, ja)
- [ ] Consent requirements 설정 (TERMS, PRIVACY, MARKETING_EMAIL)

### User Registration & Login (Must Have)

- [ ] 사용자 회원가입 가능 (LOCAL)
- [ ] OAuth 로그인 가능 (Google, Kakao, Naver)
- [ ] 로그인 시 JWT에 services 배열 포함
- [ ] Domain 기반 서비스 감지 (localhost:5173 → my-girok)
- [ ] Session 관리 작동 (cookie-based via BFF)
- [ ] 로그아웃 작동

### Admin Management (Must Have)

- [ ] web-admin에서 my-girok 서비스 조회 가능
- [ ] Config 탭에서 설정 수정 가능
- [ ] Countries 탭에서 국가 추가/제거 가능
- [ ] Locales 탭에서 언어 추가/제거 가능
- [ ] Consents 탭에서 동의 항목 관리 가능

### Out of Scope (Phase 2)

- ❌ Resume 생성/조회/수정/삭제
- ❌ 이력서 작성 (experience, education, skills)
- ❌ PDF 생성
- ❌ 파일 업로드 (profile image, certificates)
- ❌ Public profile 공유

## Tasks

**Location**: `../tasks/2026-Q1-phase1-auth/`

| #   | Task                 | Status  |
| --- | -------------------- | ------- |
| 01  | Database Audit       | ✅ Done |
| 02  | Service Cleanup      | Pending |
| 03  | Service Registration | Blocked |
| 04  | Domain-Based Auth    | Blocked |
| 05  | JWT Enhancement      | Blocked |
| 06  | Frontend Integration | Blocked |
| 07  | Admin UI Testing     | Blocked |
| 08  | Documentation        | Blocked |

**Total**: 8 tasks

## Dependencies

### Technical

- Identity Platform (identity-service, auth-service) - ✅ Available
- auth-bff - ✅ Available
- web-admin - ✅ Available
- PostgreSQL auth_db - ✅ Available

### External

- OAuth providers 설정 (Google, Kakao, Naver)
- Domain 설정 (my-girok.com, localhost:5173)

## Risks & Mitigation

| Risk                         | Impact | Mitigation             |
| ---------------------------- | ------ | ---------------------- |
| 기존 서비스 데이터 손실      | Medium | Backup 먼저 생성       |
| OAuth callback URL 설정 오류 | Low    | 환경별로 분리 설정     |
| JWT token 구조 변경 영향     | Medium | 기존 코드 검토 후 적용 |

## Verification

### End-to-End Test

1. **회원가입 테스트**:

   ```bash
   # 1. /consent 페이지에서 동의 확인
   open http://localhost:5173/consent

   # 2. /register 페이지에서 회원가입
   # - Email: test@example.com
   # - Username: testuser
   # - Password: test1234
   # - Country: KR
   # - Consents: TERMS ✅, PRIVACY ✅, MARKETING_EMAIL ⬜

   # 3. 회원가입 성공 → /resume/my 리다이렉트
   ```

2. **로그인 테스트**:

   ```bash
   # 1. /login 페이지에서 로그인
   # - Email: test@example.com
   # - Password: test1234

   # 2. 로그인 성공 → /resume/my 리다이렉트

   # 3. JWT 토큰 확인
   # - 개발자 도구 → Application → Cookies → session_token
   # - Decode JWT: services 배열 포함 확인
   ```

3. **OAuth 로그인 테스트**:

   ```bash
   # 1. /login 페이지에서 "Login with Google" 클릭
   # 2. Google OAuth 인증
   # 3. 로그인 성공 → /resume/my 리다이렉트
   ```

4. **Admin UI 테스트**:

   ```bash
   # 1. web-admin 접속
   open http://localhost:5174/services

   # 2. my-girok 서비스 클릭
   # 3. 모든 탭 확인:
   #    - Config: JWT validation ✅, Domain validation ✅
   #    - Countries: KR, US, JP 표시
   #    - Locales: ko, en, ja 표시
   #    - Consents: 각 국가별 동의 항목 표시
   ```

## Next Phase

→ **Phase 2**: `scopes/2026-Q1-phase2-core.md`

Resume CRUD, Sections, MinIO, PDF Export, Public Sharing
