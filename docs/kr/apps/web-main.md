# 웹 메인 애플리케이션

> My-Girok 플랫폼을 위한 공개용 웹 애플리케이션

## 기술 스택

| 기술         | 버전 | 목적            |
| ------------ | ---- | --------------- |
| React        | 19.2 | UI 프레임워크   |
| Vite         | 7.2  | 빌드 도구       |
| TypeScript   | 5.9  | 타입 안전성     |
| React Router | v7   | 라우팅          |
| Tailwind CSS | 4.1  | 스타일링        |
| Zustand      | 5.0  | 상태 관리       |
| Axios        | 1.13 | HTTP 클라이언트 |

## 프로젝트 구조

```
apps/web-main/src/
  layouts/          # Layout components
    AuthLayout.tsx      # Authentication pages layout
    LegalPageLayout.tsx # Legal document pages
    MainLayout.tsx      # Main app layout with Navbar

  pages/            # Route pages
    resume/             # Resume-related pages

  components/       # Shared components
    Navbar.tsx          # Navigation bar
    Footer.tsx          # Footer component
    resume/             # Resume components

  api/              # API clients
    auth.ts             # Authentication API
    resume.ts           # Resume API
    legal.ts            # Legal API

  stores/           # Zustand stores
    authStore.ts        # Authentication state
    userPreferencesStore.ts # User preferences

  hooks/            # Custom hooks
    useResumeViewer.ts  # Resume viewer logic

  utils/            # Utility functions
    pdf.ts              # PDF utilities
    imageProxy.ts       # Image proxy helper

  i18n/             # Internationalization
    config.ts           # i18n configuration
```

## 라우트

| 경로                  | 인증      | 설명                    |
| --------------------- | --------- | ----------------------- |
| `/`                   | Public    | 랜딩 페이지 / 대시보드  |
| `/login`              | Public    | 로그인 페이지           |
| `/register`           | Public    | 회원가입 페이지         |
| `/resume/:username`   | Public    | 공개 이력서 보기        |
| `/shared/:token`      | Public    | 토큰을 통한 공유 이력서 |
| `/resume/my`          | Protected | 사용자의 이력서 목록    |
| `/resume/edit/:id`    | Protected | 이력서 편집기           |
| `/resume/preview/:id` | Protected | 인쇄 미리보기           |
| `/settings`           | Protected | 사용자 설정             |

### 디자인 시스템 (WCAG 2.1 AAA)

#### 타이포그래피

```css
/* Title - Editorial Style */
font-serif-title tracking-editorial italic text-5xl

/* Brand - Monospace */
font-mono-brand tracking-brand uppercase text-[11px]
```

#### 컴포넌트

```css
/* Card */
rounded-soft border-2 p-10 md:p-14

/* Input */
h-16 rounded-soft

/* Button */
min-h-[64px] font-black uppercase tracking-brand
```

#### 레이아웃 패턴

```tsx
// Footer as sibling of main, not child
<>
  <main className="min-h-screen pt-nav">{/* Page Content */}</main>
  <Footer />
</>
```

## API 아키텍처

### Axios 인스턴스

```typescript
// Public API - No 401 interceptor
export const publicApi = axios.create({ baseURL: API_URL });

// Auth API - With 401 interceptor for token refresh
export const authApi = axios.create({ baseURL: API_URL });
```

### 토큰 저장소

| 토큰          | 저장소          | 목적               |
| ------------- | --------------- | ------------------ |
| Access Token  | localStorage    | API authentication |
| Refresh Token | HttpOnly Cookie | Token refresh      |

## 성능 최적화 베스트 프랙티스

### 메모이제이션

```typescript
// Memoize event handlers
const handleSubmit = useCallback(
  async (data) => {
    await submitForm(data);
  },
  [submitForm],
);

// Memoize computations
const filteredItems = useMemo(() => items.filter((item) => item.active), [items]);
```

### 정적 상수

```typescript
// Define outside component to prevent recreation
const LANGUAGES = [
  { code: 'ko', label: 'Korean' },
  { code: 'en', label: 'English' },
] as const;
```

### 네비게이션

```typescript
// Direct navigation after async operations
await login(credentials);
navigate('/'); // No state-based navigation
```

### i18n(번역) Fallback

```tsx
// Always provide defaultValue for missing keys
{
  t('auth.createArchive', { defaultValue: 'Create Your Archive' });
}
```

## 이력서 PDF 시스템

| 컴포넌트               | 라이브러리          | 목적                               |
| ---------------------- | ------------------- | ---------------------------------- |
| ResumePdfDocument      | @react-pdf/renderer | Generate PDF                       |
| ResumePreview          | react-pdf           | Display PDF                        |
| ResumePreviewContainer | -                   | Responsive wrapper with auto-scale |

### PDF 베스트 프랙티스

```typescript
// Filter empty values before rendering
{items
  .filter(item => item?.trim())
  .map(item => <Text key={item}>{sanitizeText(item)}</Text>)
}

// Use stable keys to prevent reconciler crash
<ResumePreviewContainer
  key={`preview-${resume.id}`}
  resume={resume}
/>
```

## 환경 변수

```bash
# API URLs
VITE_API_URL=https://auth.girok.dev
VITE_PERSONAL_API_URL=https://my.girok.dev
```

## 명령어

```bash
# Development
pnpm --filter web-main dev

# Build for production
pnpm --filter web-main build

# Run tests
pnpm --filter web-main test
```

---

**LLM Reference**: `docs/llm/apps/web-main.md`
