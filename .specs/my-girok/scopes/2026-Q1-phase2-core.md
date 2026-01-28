# Scope: 2026-Q1 Phase 2 - Core Features

> L2: Human approval required | Resume 핵심 기능 복구

## Target

Resume 생성/관리, 파일 업로드, PDF 생성, 공개 프로필 기능 복구

## Period

2026-02-11 ~ 2026-02-28 (2주)

## Prerequisites

- ✅ Phase 1 완료: 로그인/회원가입 정상 작동
- ✅ my-girok 서비스 auth_db에 등록됨
- ✅ JWT에 services 배열 포함

## Items

| Priority | Feature                | Status |
| -------- | ---------------------- | ------ |
| P0       | Database Setup         | ⏳     |
| P0       | Resume CRUD            | ⏳     |
| P0       | Sections Management    | ⏳     |
| P0       | File Upload (MinIO)    | ⏳     |
| P1       | PDF Export             | ⏳     |
| P1       | Public Profile Sharing | ⏳     |

## Success Criteria

### Database & Infrastructure (Must Have)

- [ ] PostgreSQL personal_db 생성
- [ ] Prisma migrations 실행 완료
- [ ] Database connection 정상 작동
- [ ] MinIO bucket 생성 (my-girok-resumes)
- [ ] MinIO 연결 테스트 완료

### Resume CRUD (Must Have)

- [ ] Resume 생성 가능
- [ ] Resume 목록 조회 가능
- [ ] Resume 상세 조회 가능
- [ ] Resume 수정 가능
- [ ] Resume 삭제 가능
- [ ] Resume 복사 가능
- [ ] 기본 이력서 설정 가능

### Sections Management (Must Have)

- [ ] Experience (경력) CRUD
- [ ] Education (학력) CRUD
- [ ] Skills (스킬) CRUD
- [ ] Certificates (자격증) CRUD
- [ ] Section 순서 변경
- [ ] Section 표시/숨김

### File Upload (Must Have)

- [ ] Profile image 업로드
- [ ] Certificate 파일 업로드
- [ ] 파일 조회 (pre-signed URL)
- [ ] 파일 삭제
- [ ] 파일 크기 제한 (10MB)
- [ ] 파일 타입 검증 (image/\*, application/pdf)

### PDF Export (Should Have)

- [ ] Resume PDF 생성 (A4)
- [ ] Resume PDF 생성 (Letter)
- [ ] PDF 미리보기 (브라우저)
- [ ] PDF 다운로드
- [ ] 다국어 지원 (ko, en, ja)
- [ ] CORS 이미지 proxy 작동

### Public Sharing (Should Have)

- [ ] Public profile 활성화/비활성화
- [ ] Public profile URL 생성 (/resume/:username)
- [ ] Share link 생성
- [ ] Share link 만료 설정
- [ ] Public profile 조회 (인증 불필요)

### User Preferences (Nice to Have)

- [ ] Theme 설정 (light/dark)
- [ ] Language 설정 (ko/en/ja)
- [ ] Paper size 설정 (A4/Letter)
- [ ] Section order 커스터마이징

## Tasks

**Location**: `../tasks/2026-Q1-phase2-core/`

| #   | Task                       | Status  |
| --- | -------------------------- | ------- |
| 09  | Database Setup             | Pending |
| 10  | Resume CRUD Restoration    | Blocked |
| 11  | Sections Restoration       | Blocked |
| 12  | MinIO Integration          | Blocked |
| 13  | PDF Export Restoration     | Blocked |
| 14  | Public Sharing Restoration | Blocked |

**Total**: 6 tasks

## Dependencies

### Technical

- Phase 1 완료 - ✅ Required
- PostgreSQL database - ⚠️ Needs setup
- MinIO storage - ⚠️ Needs setup
- Valkey cache - ⚠️ Needs setup
- personal-service - ⚠️ Needs update

### External

- MinIO bucket 생성 권한
- S3 access key 설정
- CORS 설정

## Risks & Mitigation

| Risk                    | Impact | Mitigation               |
| ----------------------- | ------ | ------------------------ |
| Database migration 실패 | High   | Schema 검증, backup 생성 |
| MinIO 연결 오류         | High   | 초기에 connection test   |
| PDF 생성 성능 이슈      | Medium | Caching 구현, 최적화     |
| 파일 업로드 용량 문제   | Medium | 10MB 제한, 압축 고려     |
| CORS 이미지 로딩 실패   | Low    | Proxy 서버 구현          |

## Verification

### End-to-End Test

1. **Resume 생성 테스트**:

   ```bash
   # 1. 로그인 후 /resume/my 접속
   # 2. "새 이력서 만들기" 클릭
   # 3. 이력서 이름 입력: "Software Engineer Resume"
   # 4. 저장 → 이력서 목록에 표시 확인
   ```

2. **Sections 작성 테스트**:

   ```bash
   # 1. 이력서 편집 (/resume/edit/:id)
   # 2. Experience 추가:
   #    - Company: Beegy Labs
   #    - Position: Software Engineer
   #    - Period: 2023-01 ~ Present
   #    - Description: Backend development
   # 3. Education 추가
   # 4. Skills 추가
   # 5. 저장 → 데이터 유지 확인
   ```

3. **파일 업로드 테스트**:

   ```bash
   # 1. Profile image 업로드
   #    - 이미지 선택 (< 10MB)
   #    - 업로드 완료 → 미리보기 표시
   # 2. Certificate 업로드
   #    - PDF 파일 선택
   #    - 업로드 완료 → 다운로드 가능
   ```

4. **PDF 생성 테스트**:

   ```bash
   # 1. 이력서 미리보기 (/resume/preview/:id)
   # 2. PDF 렌더링 확인 (canvas)
   # 3. "PDF 다운로드" 클릭
   # 4. 파일 다운로드 → 열어서 확인
   # 5. A4/Letter 전환 테스트
   ```

5. **Public 공유 테스트**:
   ```bash
   # 1. 이력서 설정에서 "Public 프로필 활성화"
   # 2. Username 설정: testuser
   # 3. Public URL 확인: /resume/testuser
   # 4. 로그아웃 상태에서 접속
   # 5. 이력서 조회 가능 확인
   ```

## API Endpoints to Restore

### Resume

```
POST   /v1/resume              # Create
GET    /v1/resume              # List all
GET    /v1/resume/:id          # Get one
PUT    /v1/resume/:id          # Update
DELETE /v1/resume/:id          # Delete
POST   /v1/resume/:id/copy     # Duplicate
PATCH  /v1/resume/:id/default  # Set default
```

### Sections

```
POST   /v1/resume/:id/experience
PUT    /v1/resume/:id/experience/:expId
DELETE /v1/resume/:id/experience/:expId
# Similar for education, skills, certificates
```

### Attachments

```
POST   /v1/resume/:id/attachments
GET    /v1/resume/:id/attachments/:aid
DELETE /v1/resume/:id/attachments/:aid
```

### Public

```
GET    /v1/resume/public/:username  # Public profile
GET    /v1/share/public/:token      # Shared resume
POST   /v1/share/resume/:resumeId   # Create share link
```

## Database Schema

**Target**: `services/personal-service/prisma/schema.prisma`

**Tables**:

- resumes
- sections
- experiences
- educations
- skills
- attachments
- user_preferences

## Previous Phase

← **Phase 1**: `scopes/2026-Q1-phase1-auth.md`

## Next Phase

→ **Phase 3**: Quality & Testing (80% coverage)
