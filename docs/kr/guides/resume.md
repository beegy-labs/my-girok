# 이력서 기능 가이드

> 전문 이력서를 실시간 미리보기 및 PDF 내보내기로 구축 및 관리합니다.

## 아키텍처 개요

```
ResumeEditPage
├── ResumeForm (input, 800ms debounce)
│   ├── SectionOrderManager (drag-drop)
│   ├── ExperienceSection
│   ├── EducationSection
│   ├── SkillsSection
│   └── HierarchicalDescription (4 depth)
└── ResumePreviewContainer
    └── ResumePdfDocument (@react-pdf/renderer)
```

## 데이터 흐름

```
User Input -> ResumeForm -> onChange (800ms debounce) -> PDF Preview
                 |
                 v
            Save -> API -> personal-service -> Database
```

변경 사항은 디바운스되어 과도한 재렌더링과 API 호출을 방지하면서 반응성 있는 느낌을 유지합니다.

## 섹션 유형

| Type               | Icon | 한글       | 노트                           |
| ------------------ | ---- | ---------- | ------------------------------ |
| BASIC_INFO         | -    | 기본정보   | 항상 첫 번째, 재정렬 불가      |
| EXPERIENCE         | 💼   | 경력       | 회사 → 프로젝트 → 성과         |
| EDUCATION          | 🎓   | 학력       | 드래그 앤 드롭 정렬, 학위 enum |
| SKILLS             | ⚡   | 기술       | 카테고리 → 항목 → 설명         |
| CERTIFICATE        | 🏆   | 자격증     |                                |
| KEY_ACHIEVEMENTS   | 🏅   | 핵심성과   | 문자열 배열                    |
| APPLICATION_REASON | 💡   | 지원동기   |                                |
| COVER_LETTER       | 📝   | 자기소개서 |                                |

## 한국 시장 전용 필드

| 필드              | 타입       | 목적                                   |
| ----------------- | ---------- | -------------------------------------- |
| birthDate         | YYYY-MM-DD | 만 나이 계산                           |
| gender            | enum       | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| militaryService   | enum       | COMPLETED, EXEMPTED, NOT_APPLICABLE    |
| coverLetter       | string     | 자기소개서 (self-introduction)         |
| applicationReason | string     | 지원 동기 (motivation for applying)    |
| keyAchievements   | string[]   | 주요 성과 (key accomplishments)        |

## 계층적 성과

4단계 중첩 성과를 지원합니다:

```
• Depth 1 (Main)
  ◦ Depth 2 (Sub)
    ▪ Depth 3 (Details)
      ▫ Depth 4 (Specific)
```

경력(성과) 및 기술(설명) 섹션에서 사용됩니다.

## Paged.js 통합

페이지 매김된 인쇄 미리보기를 위해:

```typescript
useEffect(() => {
  if (viewMode === 'paginated' && contentRef.current) {
    const paged = new Previewer();
    const dynamicCSS = `@page {
      size: ${paperSize === 'A4' ? 'A4' : 'letter'};
      margin: 0;
    }`;
    paged.preview(content, [dynamicCSS], container);
  }
}, [viewMode, resume, paperSize]);
```

## 인쇄 CSS

```css
@media print {
  #resume-content {
    display: none !important;
  }
  .pagedjs-container {
    display: block !important;
  }
  .pagedjs_page {
    width: 100% !important;
    max-width: 100% !important;
  }
  a,
  span,
  p,
  div,
  li {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  img,
  video,
  svg {
    max-width: 100% !important;
    height: auto !important;
  }
}
```

## 권장 인쇄 설정

| 설정        | 값             |
| ----------- | -------------- |
| 여백        | 없음           |
| 헤더/바닥글 | 없음           |
| 배경 그래픽 | 켜짐           |
| 용지 크기   | A4 또는 Letter |

## PDF 내보내기 함수

```typescript
exportResumeToPDF(); // Download as file
generateResumePDFBlob(); // Get as Blob
generateResumePDFBase64(); // Get as Base64
printResumePDF(); // Open print dialog
```

이미지는 PDF 생성 시 CORS 우회를 위해 Base64로 변환됩니다.

## React 19 호환성

```typescript
// Use pdf() function instead of usePDF hook (deprecated in React 19)
// Key={Date.now()} workaround for reconciler crash
<ResumePreviewContainer key={Date.now()} resume={resume} />
```

Key={Date.now()}는 리컨실리어러 충돌 방지를 위한 우회입니다.

## 성능 최적화

### 디바운싱 (800ms)

```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    onChange(formData);
  }, 800);
  return () => clearTimeout(timeoutRef.current);
}, [formData]);
```

### 메모이제이션

```typescript
const SECTION_ICONS = { EXPERIENCE: '💼', EDUCATION: '🎓' };
const handleEdit = useCallback((id) => navigate(`/edit/${id}`), [navigate]);
```

### 미리보기 스케일링

| 화면 너비         | 스케일 |
| ----------------- | ------ |
| 데스크탑 (>794px) | 100%   |
| 태블릿 (~768px)   | ~93%   |
| 모바일 (~375px)   | ~43%   |

## 파일 저장 정책

| 측면      | 정책                                              |
| --------- | ------------------------------------------------- |
| 저장소    | 원본 컬러 이미지만                                |
| 표시      | 컬러 기본, CSS 그레이스케일 토글 사용 가능        |
| 위치      | MinIO: `resumes/{userId}/{resumeId}/{uuid}.{ext}` |
| 임시 파일 | `tmp/{userId}/{uuid}.{ext}` (24h cleanup)         |

## 공유 링크

| 유형           | 프론트엔드 라우트 | 백엔드 엔드포인트                 |
| -------------- | ----------------- | --------------------------------- |
| Public profile | `/:username`      | `GET /v1/resume/public/:username` |
| Share link     | `/shared/:token`  | `GET /v1/share/public/:token`     |

### 공유 링크 생성

```
POST /v1/share/resume/:resumeId
```

응답:

```json
{
  "id": "share-uuid",
  "token": "share-token",
  "resumeId": "resume-uuid",
  "expiresAt": "2025-01-31T00:00:00Z"
}
```

공유 URL: `https://domain/shared/${token}`

## DegreeType 열거형

| 값          | 한글     | 영어             |
| ----------- | -------- | ---------------- |
| HIGH_SCHOOL | 고등학교 | High School      |
| ASSOCIATE_2 | 2년제    | 2-Year Associate |
| ASSOCIATE_3 | 3년제    | 3-Year Associate |
| BACHELOR    | 학사     | Bachelor's       |
| MASTER      | 석사     | Master's         |
| DOCTORATE   | 박사     | Doctorate        |

## 교육 모델

```typescript
interface Education {
  school: string; // required
  major: string; // required
  degree?: DegreeType; // optional
  startDate: string; // YYYY-MM
  endDate?: string; // null = currently enrolled
  gpa?: string;
  order: number; // drag-drop order
}
```

## 디자인 준수

```tsx
// Use theme tokens (SSOT)
className = 'bg-theme-bg-card text-theme-text-primary rounded-soft';

// Follow 8pt grid
className = 'p-4 gap-4 mb-4'; // 16px
```

테마 토큰(SSOT) 사용. 8pt 그리드 준수.

## 파일 위치

| 경로                                             | 목적                          |
| ------------------------------------------------ | ----------------------------- |
| `apps/web-girok/src/components/resume/`          | Form, Preview, PDF components |
| `services/personal-service/src/resume/`          | API, Service, DTOs            |
| `services/personal-service/prisma/schema.prisma` | Database schema               |
| `.ai/resume.md`                                  | LLM reference documentation   |

## 변경 로그

| 날짜       | 변경 사항                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------- |
| 2025-12-26 | birthYear 제거, PREFER_NOT_TO_SAY gender 추가, SectionType 확장, 소프트 삭제, UUIDv7 토큰 |
| 2025-12-23 | PDF 충돌 수정, sanitizeText() 추가, 800ms 디바운스                                        |
| 2025-11-20 | birthDate, gender 필드 추가                                                               |
| 2025-11-19 | Paged.js 통합, 여백 최적화                                                                |

**LLM 참조**: `docs/llm/guides/RESUME.md`
