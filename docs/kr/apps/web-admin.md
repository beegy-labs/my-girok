# 웹 관리 애플리케이션

> Girok H-RBAC 다중 테넌트 시스템용 관리자 콘솔

## 기술 스택

| Technology    | Version | Purpose       |
| ------------- | ------- | ------------- |
| React         | 19      | UI 프레임워크 |
| Vite          | 7       | 빌드 도구     |
| TypeScript    | 5       | 타입 안전성   |
| Zustand       | -       | 상태 관리     |
| react-i18next | -       | 국제화        |
| Tailwind CSS  | 4       | 스타일링      |
| Recharts      | -       | 차트          |

**지원 언어**: English, Korean, Japanese, Hindi

## 프로젝트 구조

```
src/
  components/
    atoms/        # Basic UI elements
      Button, Input, Select, Badge, Spinner, Card, TruncatedId

    molecules/    # Composed components
      Pagination, SearchInput, StatusBadge, ConfirmDialog, Modal

    organisms/    # Complex components
      PageHeader, DataTable

    templates/    # Page templates
      ListPageTemplate

  config/
    legal.config.ts     # Document types, locales
    tenant.config.ts    # Status, tenant types
    region.config.ts    # Regions, laws, consents
    chart.config.ts     # Chart colors
    status.config.ts    # Status badge variants
    menu.config.ts      # Sidebar menu
```

## 라우트 및 권한

| Path                   | Permission     | Component         |
| ---------------------- | -------------- | ----------------- |
| `/`                    | -              | DashboardPage     |
| `/legal/documents`     | legal:read     | DocumentsPage     |
| `/legal/documents/new` | legal:create   | DocumentEditPage  |
| `/legal/documents/:id` | legal:update   | DocumentEditPage  |
| `/legal/consents`      | legal:read     | ConsentsPage      |
| `/tenants`             | tenant:read    | TenantsPage       |
| `/tenants/:id`         | tenant:\*      | TenantEditPage    |
| `/audit-logs`          | audit:read     | AuditLogsPage     |
| `/services`            | service:read   | ServicesPage      |
| `/services/:id`        | service:update | ServiceDetailPage |

## 보안 패턴

### 입력 정제

```typescript
import { sanitizeSearchInput, sanitizeUrl, logger } from '@/utils';

// Sanitize user input
const sanitized = sanitizeSearchInput(userInput);

// Validate and sanitize URLs
const url = sanitizeUrl(input); // Returns null if invalid
```

### ID 표시

```typescript
// Truncated UUID display with copy button
<TruncatedId id={uuid} length={8} showCopy />

// Utility function
truncateUuid('abc12345-...', 8);  // Returns "abc12345..."
```

### 프로덕션 안전 로깅

```typescript
// No stack traces in production
logger.error('Operation failed', err);
```

### 확인 대화상자

```tsx
// Always use ConfirmDialog, never native confirm()
<ConfirmDialog
  isOpen={showConfirm}
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

## 스타일 가이드라인

### 테마 클래스

```tsx
// Use theme-* classes, never hardcoded colors
<div className="bg-theme-bg-card text-theme-text-primary">
  <Badge variant="success">Active</Badge>
</div>
```

### 테이블 셀

```tsx
// ID column
<TruncatedId id={item.id} />

// Status column
<Badge variant={config.variant}>{label}</Badge>

// Date column
{formatAdminDate(date)}
```

## 토큰 갱신 흐름

```typescript
// Single refresh promise prevents race conditions
let refreshPromise: Promise<string> | null = null;

// 401 + valid token -> refresh once, retry all queued requests
// 401 + no token -> redirect to /login
// Refresh fails -> clear auth state, redirect to /login
```

## OTEL 통합

### 구성

```typescript
// lib/otel/config.ts
export const otelConfig = {
  serviceName: 'web-admin',
  endpoint: import.meta.env.VITE_OTEL_ENDPOINT,
  samplingRate: import.meta.env.PROD ? 0.1 : 1.0,
};
```

### 사용법

```typescript
// hooks/useAuditEvent.ts
const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();

// Track user actions
trackButtonClick('create_btn', { serviceId });
trackSearch(query, result.total);
```

## 역할 정의

| Role             | Scope  | Permissions                    |
| ---------------- | ------ | ------------------------------ |
| system_super     | SYSTEM | \* (all permissions)           |
| system_admin     | SYSTEM | tenant, user, legal, audit     |
| system_moderator | SYSTEM | content, user:read, audit:read |
| partner_super    | TENANT | partner_admin, legal:read      |

## 디자인 원칙

**우선순위**: 정보 밀도 > 가독성 > WCAG

> 참고: 내부 관리자 인터페이스에서는 효율성을 우선시하기 위해 WCAG 준수가 완화됩니다.

| Pattern        | Implementation  |
| -------------- | --------------- |
| Dense Tables   | 밀집 테이블     |
| Inline Actions | 인라인 액션     |
| Monospace IDs  | 모노스페이스 ID |
| Status Badges  | 상태 배지       |
| Simple Paging  | 단순 페이징     |

| Implementation               | Details               |
| ---------------------------- | --------------------- |
| Compact rows, truncated IDs  | 컴팩트한 행, 잘린 ID  |
| Icon buttons in cells        | 셀에 아이콘 버튼      |
| font-mono text-xs            | font-mono text-xs     |
| Badge with semantic variants | 의미 있는 변형의 배지 |
| prev/next only               | 이전/다음만           |

## 환경 변수

```bash
VITE_API_URL=https://my-api-dev.girok.dev/auth
VITE_OTEL_ENDPOINT=https://otel.girok.dev
```

## 명령어

```bash
# Development (Port 3002)
pnpm --filter @my-girok/web-admin dev

# Build for production
pnpm --filter @my-girok/web-admin build

# Type checking
pnpm --filter @my-girok/web-admin type-check
```

**LLM 참조**: `docs/llm/apps/web-admin.md`
