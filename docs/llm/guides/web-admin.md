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

## Styling

### Theme Variables

```css
/* Correct */
text-theme-text-primary
bg-theme-bg-card
border-theme-border
bg-theme-status-success-bg

/* Wrong - no raw colors */
text-gray-900
bg-white
```

### Badge Variants

| Variant | Use               |
| ------- | ----------------- |
| success | Active, approved  |
| warning | Pending           |
| error   | Suspended, failed |
| info    | Information       |
| default | Neutral           |

## i18n

Locales: en, ko, ja, hi

Key format: `{namespace}.{section}.{key}`

## Design Principles

Priority: Information Density > Readability > WCAG AAA (intentionally ignored for admin)

| Pattern             | Implementation                |
| ------------------- | ----------------------------- |
| Dense Tables        | Compact rows, truncated UUIDs |
| Inline Actions      | Icon buttons in cells         |
| Collapsible Filters | Show/hide with badge count    |
| IDs                 | `font-mono text-xs`           |
| Status              | Badge component               |
| Pagination          | Previous/Next + range         |

### Table Cell Patterns

```tsx
// ID
<td><TruncatedId id={item.id} length={8} showCopy /></td>

// Status
<td><Badge variant={statusConfig.variant}>{t(statusConfig.labelKey)}</Badge></td>

// Date
<td className="text-theme-text-secondary whitespace-nowrap">{formatAdminDate(date)}</td>

// Actions
<td><div className="flex items-center gap-1">
  <button className="p-1.5"><Pencil size={14} /></button>
  <button className="p-1.5"><Trash2 size={14} /></button>
</div></td>
```

### ID Utilities

```typescript
import { TruncatedId } from '@/components/atoms';
import { truncateUuid, formatAdminDate } from '@/utils/sanitize';

<TruncatedId id="abc12345-..." />        // Shows "abc12345..." with copy
truncateUuid(uuid, 8);                   // "abc12345..."
formatAdminDate(new Date());             // "Dec 25" or "Dec 25, 2024"
```

## Troubleshooting

| Issue                | Solution                               |
| -------------------- | -------------------------------------- |
| Menu not updating    | Clear localStorage, refresh            |
| 401 errors           | Check token, backend, CORS             |
| Missing translations | Check all locale files, restart dev    |
| Page crashes         | Error boundary shows UI, check console |
