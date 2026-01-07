# Web Admin Console Guide

> Internal administration interface for platform management

## Quick Start

```bash
pnpm --filter @my-girok/web-admin dev        # Start dev server (port 3002)
pnpm --filter @my-girok/web-admin build      # Production build
pnpm --filter @my-girok/web-admin type-check # TypeScript validation
```

### Default Development Credentials

| Username     | Password       | Role         |
| ------------ | -------------- | ------------ |
| super_admin  | SuperAdmin123! | system_super |
| system_admin | SystemAdmin1!  | system_admin |

## Technology Stack

| Technology     | Purpose              |
| -------------- | -------------------- |
| React 19       | UI framework         |
| TypeScript 5   | Type safety          |
| Vite 7         | Build tool           |
| Tailwind CSS 4 | Styling              |
| Zustand        | State management     |
| TipTap         | WYSIWYG editor       |
| Recharts       | Data visualization   |
| react-i18next  | Internationalization |

## Directory Structure

```
apps/web-admin/src/
├── api/           # API client functions
├── config/        # SSOT configuration files
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

## Atomic Design Components

| Level     | Components                                               |
| --------- | -------------------------------------------------------- |
| atoms     | Button, Input, Select, Badge, Spinner, Card              |
| molecules | Pagination, SearchInput, ConfirmDialog, Modal, FilterBar |
| organisms | PageHeader, DataTable                                    |
| templates | ListPageTemplate                                         |

## SSOT Configuration Files

| File             | Purpose                             |
| ---------------- | ----------------------------------- |
| legal.config.ts  | Document types, supported locales   |
| tenant.config.ts | Partner statuses, badge variants    |
| region.config.ts | Regions, laws, consent requirements |
| chart.config.ts  | Theme-aware chart colors            |
| status.config.ts | Status-to-badge mappings            |
| menu.config.ts   | Sidebar navigation structure        |

## Security Patterns

### No Native Dialogs

Never use browser native dialogs:

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

### Input Sanitization

```typescript
import { sanitizeSearchInput, sanitizeUrl } from '@/utils/sanitize';

const sanitized = sanitizeSearchInput(input);
const safeUrl = sanitizeUrl(userUrl); // Returns null if invalid
```

### Production-Safe Logging

```typescript
import { logger } from '@/utils/logger';

logger.error('Operation failed', err); // Stack traces hidden in production
```

## Permission System

### Pattern

`resource:action`

### Available Permissions

| Permission     | Description                  |
| -------------- | ---------------------------- |
| legal:read     | View legal documents         |
| legal:create   | Create legal documents       |
| legal:update   | Edit legal documents         |
| legal:delete   | Delete legal documents       |
| tenant:read    | View partner information     |
| tenant:create  | Create new partners          |
| tenant:update  | Update partner details       |
| tenant:approve | Approve partner applications |
| audit:read     | View audit logs              |

### Wildcards

- `legal:*` - All legal permissions
- `*` - Super admin (all permissions)

### Usage

```typescript
const { hasPermission } = useAdminAuthStore();

if (hasPermission('legal:create')) {
  // Show create button
}
```

## Adding New Pages

### 1. Create Page Component

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

### 2. Add Route

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

### 3. Add Menu Entry

```typescript
// src/config/menu.config.ts
{
  id: 'sales',
  path: '/reports/sales',
  labelKey: 'menu.salesReport'
}
```

### 4. Add Translations

Add to all locale files: `en.json`, `ko.json`, `ja.json`, `hi.json`

## Styling Guidelines

### Theme Variables

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

### Badge Variants

| Variant | Use Case                 |
| ------- | ------------------------ |
| success | Active, approved states  |
| warning | Pending states           |
| error   | Suspended, failed states |
| info    | Informational states     |
| default | Neutral states           |

## Internationalization

### Supported Locales

- en (English)
- ko (Korean)
- ja (Japanese)
- hi (Hindi)

### Key Format

`{namespace}.{section}.{key}`

Example: `legal.documents.createTitle`

## Design Principles

**Priority Order**: Information Density > Readability > WCAG AAA

Note: WCAG AAA compliance is intentionally relaxed for admin interfaces to maximize information density.

| Pattern             | Implementation                        |
| ------------------- | ------------------------------------- |
| Dense Tables        | Compact rows, truncated UUIDs         |
| Inline Actions      | Icon buttons in table cells           |
| Collapsible Filters | Show/hide with active filter count    |
| IDs                 | `font-mono text-xs` styling           |
| Status              | Badge component with semantic colors  |
| Pagination          | Previous/Next with page range display |

### Table Cell Patterns

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

### ID Utilities

```typescript
import { TruncatedId } from '@/components/atoms';
import { truncateUuid, formatAdminDate } from '@/utils/sanitize';

<TruncatedId id="abc12345-..." />     // Shows "abc12345..." with copy button
truncateUuid(uuid, 8);                // Returns "abc12345..."
formatAdminDate(new Date());          // Returns "Dec 25" or "Dec 25, 2024"
```

## Troubleshooting

| Issue                | Solution                                           |
| -------------------- | -------------------------------------------------- |
| Menu not updating    | Clear localStorage, hard refresh                   |
| 401 errors           | Check token validity, backend status, CORS config  |
| Missing translations | Verify key in all locale files, restart dev server |
| Page crashes         | Check error boundary UI, review browser console    |

---

**LLM Reference**: `docs/llm/guides/WEB_ADMIN.md`
