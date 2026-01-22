# Web Admin Console

## Quick Start

```bash
pnpm --filter @my-girok/web-admin dev    # port 3002
pnpm --filter @my-girok/web-admin build
pnpm --filter @my-girok/web-admin type-check
```

### Default Credentials

| Username     | Password       | Role         |
| ------------ | -------------- | ------------ |
| super_admin  | SuperAdmin123! | system_super |
| system_admin | SystemAdmin1!  | system_admin |

## Stack

| Tech           | Purpose |
| -------------- | ------- |
| React 19       | UI      |
| TypeScript 5   | Types   |
| Vite 7         | Build   |
| Tailwind CSS 4 | Styling |
| Zustand        | State   |
| TipTap         | WYSIWYG |
| Recharts       | Charts  |
| react-i18next  | i18n    |

## Directory Structure

```
apps/web-admin/src/
├── api/           # API clients
├── config/        # SSOT configs
├── components/    # Atomic design
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── hooks/         # useFetch, useFilteredMenu
├── layouts/       # AdminLayout
├── pages/         # Routes
├── stores/        # Zustand (auth, menu)
├── utils/         # logger, sanitize
└── i18n/          # Translations
```

## Atomic Design

| Level     | Components                                               |
| --------- | -------------------------------------------------------- |
| atoms     | Button, Input, Select, Badge, Spinner, Card              |
| molecules | Pagination, SearchInput, ConfirmDialog, Modal, FilterBar |
| organisms | PageHeader, DataTable                                    |
| templates | ListPageTemplate                                         |

## SSOT Config Files

| File             | Purpose                     |
| ---------------- | --------------------------- |
| legal.config.ts  | Document types, locales     |
| tenant.config.ts | Statuses, badge variants    |
| region.config.ts | Regions, laws, consent reqs |
| chart.config.ts  | Theme-based colors          |
| status.config.ts | Status badge mappings       |
| menu.config.ts   | Sidebar structure           |

## Security

### No Native Dialogs

```typescript
// Wrong
if (confirm('Delete?')) { ... }

// Correct
<ConfirmDialog isOpen={...} title={...} variant="danger" onConfirm={...} onCancel={...} />
```

### Input Sanitization

```typescript
import { sanitizeSearchInput, sanitizeUrl } from '@/utils/sanitize';
const sanitized = sanitizeSearchInput(input);
const safeUrl = sanitizeUrl(userUrl); // null if invalid
```

### Production Logging

```typescript
import { logger } from '@/utils/logger';
logger.error('Failed', err); // No stack trace in prod
```

## Permissions

Pattern: `resource:action`

| Permission     | Description       |
| -------------- | ----------------- |
| legal:read     | View legal docs   |
| legal:create   | Create legal docs |
| legal:update   | Edit legal docs   |
| legal:delete   | Delete legal docs |
| tenant:read    | View partners     |
| tenant:create  | Create partners   |
| tenant:update  | Update partners   |
| tenant:approve | Approve partners  |
| audit:read     | View audit logs   |

Wildcards: `legal:*`, `*` (super admin)

### Usage

```typescript
const { hasPermission } = useAdminAuthStore();
if (hasPermission('legal:create')) { ... }
```

## Adding Pages

### 1. Page Component

```tsx
export default function SalesReportPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h1>{t('reports.salesTitle')}</h1>
    </div>
  );
}
```

### 2. Route

```tsx
const SalesReportPage = lazy(() => import('./pages/reports/SalesReportPage'));

{ path: 'reports/sales', element: <PrivateRoute permission="analytics:read"><SalesReportPage /></PrivateRoute> }
```

### 3. Menu

```typescript
// src/config/menu.config.ts
{ id: 'sales', path: '/reports/sales', labelKey: 'menu.salesReport' }
```

### 4. Translations

Add to all 4 locale files: en.json, ko.json, ja.json, hi.json

## Related Documentation

- **Styling & Patterns**: `web-admin-patterns.md`
- **Troubleshooting**: `web-admin-patterns.md`
