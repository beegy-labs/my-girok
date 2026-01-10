# 웹 관리자 콘솔 가이드

> 플랫폼 관리를 위한 내부 관리 인터페이스입니다.

## 빠른 시작

```bash
pnpm --filter @my-girok/web-admin dev        # Start dev server (port 3002)
pnpm --filter @my-girok/web-admin build      # Production build
pnpm --filter @my-girok/web-admin type-check # TypeScript validation
```

### 기본 개발자 자격 증명

| 사용자 이름  | 비밀번호       | 역할         |
| ------------ | -------------- | ------------ |
| super_admin  | SuperAdmin123! | system_super |
| system_admin | SystemAdmin1!  | system_admin |

## 기술 스택

| 기술           | 목적           |
| -------------- | -------------- |
| React 19       | UI 프레임워크  |
| TypeScript 5   | 타입 안전성    |
| Vite 7         | 빌드 도구      |
| Tailwind CSS 4 | 스타일링       |
| Zustand        | 상태 관리      |
| TipTap         | WYSIWYG 편집기 |
| Recharts       | 데이터 시각화  |
| react-i18next  | 국제화         |

## 디렉터리 구조

```
apps/web-admin/src/
├── api/           # API client functions
├── config/        # SSOT 설정 파일
├── components/    # Atomic design components
│   ├── atoms/     # Basic UI elements
│   ├── molecules/ # Compound components
│   ├── organisms/ # Complex sections
│   └── templates/ # Page layouts
├── hooks/         # Custom hooks (useFetch, useFilteredMenu)
├── layouts/       # AdminLayout wrapper
├── pages/         # Route components
├── stores/        # Zustand stores (auth, menu)
├── utils/         # Utilities (logger, sanitize)
└── i18n/          # Translation files
```

## 원자 디자인 컴포넌트

| 레벨      | 컴포넌트                                                 |
| --------- | -------------------------------------------------------- |
| atoms     | Button, Input, Select, Badge, Spinner, Card              |
| molecules | Pagination, SearchInput, ConfirmDialog, Modal, FilterBar |
| organisms | PageHeader, DataTable                                    |
| templates | ListPageTemplate                                         |

## SSOT 설정 파일

| 파일             | 목적                       |
| ---------------- | -------------------------- |
| legal.config.ts  | 문서 유형, 지원되는 로케일 |
| tenant.config.ts | 파트너 상태, 배지 변형     |
| region.config.ts | 지역, 법률, 동의 요구사항  |
| chart.config.ts  | 테마 인식 차트 색상        |
| status.config.ts | 상태-배지 매핑             |
| menu.config.ts   | 사이드바 탐색 구조         |

## 보안 패턴

### 네이티브 다이얼로그 사용 금지

```typescript
// Wrong - exposes to XSS
if (confirm('Delete?')) { ... }

// Correct - use custom component
<ConfirmDialog
  isOpen={showConfirm}
  title="Delete Item"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

### 입력 정리

```typescript
import { sanitizeSearchInput, sanitizeUrl } from '@/utils/sanitize';

const sanitized = sanitizeSearchInput(input);
const safeUrl = sanitizeUrl(userUrl); // Returns null if invalid
```

### 프로덕션 안전 로깅

```typescript
import { logger } from '@/utils/logger';

logger.error('Operation failed', err); // Stack traces hidden in production
```

## 권한 시스템

### 패턴

`resource:action`

### 사용 가능한 권한

| 권한           | 설명                      |
| -------------- | ------------------------- |
| legal:read     | 법적 문서 보기            |
| legal:create   | 법적 문서 생성            |
| legal:update   | 법적 문서 편집            |
| legal:delete   | 법적 문서 삭제            |
| tenant:read    | 파트너 정보 보기          |
| tenant:create  | 새 파트너 생성            |
| tenant:update  | 파트너 세부 정보 업데이트 |
| tenant:approve | 파트너 신청 승인          |
| audit:read     | 감사 로그 보기            |

### 와일드카드

- `legal:*` - 모든 법적 권한
- `*` - 슈퍼 관리자 (모든 권한)

### 사용 예시

```typescript
const { hasPermission } = useAdminAuthStore();

if (hasPermission('legal:create')) {
  // Show create button
}
```

## 새 페이지 추가

### 1. 페이지 컴포넌트 생성

```tsx
// src/pages/reports/SalesReportPage.tsx
export default function SalesReportPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h1>{t('reports.salesTitle')}</h1>
      {/* Page content */}
    </div>
  );
}
```

### 2. 라우트 추가

```tsx
const SalesReportPage = lazy(() => import('./pages/reports/SalesReportPage'));

// In router config
{
  path: 'reports/sales',
  element: (
    <PrivateRoute permission="analytics:read">
      <SalesReportPage />
    </PrivateRoute>
  )
}
```

### 3. 메뉴 항목 추가

```typescript
// src/config/menu.config.ts
{
  id: 'sales',
  path: '/reports/sales',
  labelKey: 'menu.salesReport'
}
```

### 4. 번역 추가

모든 로케일 파일(`en.json`, `ko.json`, `ja.json`, `hi.json`)에 추가합니다.

## 스타일 가이드라인

### 테마 변수

```css
/* Correct - use theme tokens */
text-theme-text-primary
bg-theme-bg-card
border-theme-border
bg-theme-status-success-bg

/* Wrong - no raw colors */
text-gray-900
bg-white
```

### 배지 변형

| 변형    | 사용 사례           |
| ------- | ------------------- |
| success | 활성화, 승인된 상태 |
| warning | 보류 상태           |
| error   | 정지, 실패 상태     |
| info    | 정보 상태           |
| default | 중립 상태           |

## 국제화

### 지원되는 로케일

- en (영어)
- ko (한국어)
- ja (일본어)
- hi (힌디어)

### 키 형식

`{namespace}.{section}.{key}`

예시: `legal.documents.createTitle`

## 디자인 원칙

우선순위: 정보 밀도 > 가독성 > WCAG AAA

참고: WCAG AAA 준수는 관리자 인터페이스에서 정보 밀도를 최대화하기 위해 의도적으로 완화됩니다.

| 패턴                | 구현                              |
| ------------------- | --------------------------------- |
| Dense Tables        | 컴팩트한 행, 잘린 UUID            |
| Inline Actions      | 테이블 셀에 아이콘 버튼           |
| Collapsible Filters | 활성 필터 수와 함께 표시/숨김     |
| IDs                 | `font-mono text-xs` 스타일링      |
| Status              | 의미 있는 색상의 배지 컴포넌트    |
| Pagination          | 페이지 범위 표시가 있는 이전/다음 |

### 테이블 셀 패턴

```tsx
// ID column
<td><TruncatedId id={item.id} length={8} showCopy /></td>

// Status column
<td><Badge variant={statusConfig.variant}>{t(statusConfig.labelKey)}</Badge></td>

// Date column
<td className="text-theme-text-secondary whitespace-nowrap">
  {formatAdminDate(date)}
</td>

// Actions column
<td>
  <div className="flex items-center gap-1">
    <button className="p-1.5"><Pencil size={14} /></button>
    <button className="p-1.5"><Trash2 size={14} /></button>
  </div>
</td>
```

### ID 유틸리티

```typescript
import { TruncatedId } from '@/components/atoms';
import { truncateUuid, formatAdminDate } from '@/utils/sanitize';

<TruncatedId id="abc12345-..." />     // Shows "abc12345..." with copy button
truncateUuid(uuid, 8);                // Returns "abc12345..."
formatAdminDate(new Date());          // Returns "Dec 25" or "Dec 25, 2024"
```

## 문제 해결

| 문제                 | 해결책                                                |
| -------------------- | ----------------------------------------------------- |
| Menu not updating    | localStorage를 비우고 강제 새로고침                   |
| 401 errors           | 토큰 유효성, 백엔드 상태, CORS 설정을 확인            |
| Missing translations | 모든 로케일 파일에서 키를 확인하고 개발 서버를 재시작 |
| Page crashes         | 오류 경계 UI를 확인하고 브라우저 콘솔을 검토          |

---

LLM 참조: `docs/llm/guides/WEB_ADMIN.md`
