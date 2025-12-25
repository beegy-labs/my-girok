# web-admin

> Admin console for Girok H-RBAC multi-tenant system

## Quick Reference

| Item      | Value                          |
| --------- | ------------------------------ |
| Port      | 3002                           |
| Framework | React 19, Vite 7, TypeScript 5 |
| State     | Zustand                        |
| i18n      | react-i18next (en, ko, ja, hi) |
| Styling   | Tailwind 4 + design-tokens     |
| Charts    | Recharts                       |

## Architecture

### Atomic Design Pattern

```
src/components/
├── atoms/        # Button, Input, Select, Badge, Spinner, Card
├── molecules/    # Pagination, SearchInput, StatusBadge, ConfirmDialog, Modal, FilterBar
├── organisms/    # PageHeader, DataTable
└── templates/    # ListPageTemplate
```

### SSOT Config

```
src/config/
├── legal.config.ts     # Document types, locales
├── tenant.config.ts    # Status, tenant types with BadgeVariant
├── region.config.ts    # Regions, laws, consent requirements
├── chart.config.ts     # Chart colors (theme tokens)
├── status.config.ts    # Status badge variants
├── menu.config.ts      # Sidebar menu structure
└── index.ts            # Central export
```

### React 2025 Best Practices

- **Lazy Loading**: All pages lazy-loaded with `React.lazy()`
- **Error Boundaries**: `ErrorBoundary` + `PageErrorBoundary` for page-level error isolation
- **Suspense**: Loading states via Suspense with Spinner fallback
- **useCallback/useMemo**: Memoized handlers and computed values
- **Custom Hooks**: `useFetch` for data fetching pattern

## Routes

| Path                   | Component           | Permission    |
| ---------------------- | ------------------- | ------------- |
| `/`                    | DashboardPage       | -             |
| `/legal/documents`     | DocumentsPage       | legal:read    |
| `/legal/documents/new` | DocumentEditPage    | legal:create  |
| `/legal/documents/:id` | DocumentEditPage    | legal:update  |
| `/legal/consents`      | ConsentsPage        | legal:read    |
| `/legal/consent-stats` | ConsentStatsPage    | legal:read    |
| `/legal/examples`      | ConsentExamplesPage | legal:read    |
| `/tenants`             | TenantsPage         | tenant:read   |
| `/tenants/new`         | TenantEditPage      | tenant:create |
| `/tenants/:id`         | TenantEditPage      | tenant:\*     |
| `/audit-logs`          | AuditLogsPage       | audit:read    |

## Types

All types from `@my-girok/types`:

- `LegalDocument`, `LegalDocumentType`, `SupportedLocale`
- `Tenant`, `TenantStatus`, `TenantType`
- `AuditLog`, `AuditAction`, `AuditResource`
- `ConsentStats`, `DateRange`

## Security Patterns

### Input Sanitization

```typescript
import { sanitizeSearchInput } from '@/utils/sanitize';

const sanitized = sanitizeSearchInput(userInput);
```

### Production-Safe Logging

```typescript
import { logger } from '@/utils/logger';

try {
  await api.doSomething();
} catch (err) {
  setError(t('some.errorMessage'));
  logger.error('Operation failed', err); // No stack trace in prod
}
```

### Confirmation Dialogs

```typescript
// No native confirm() - use ConfirmDialog
<ConfirmDialog
  isOpen={deleteDialog.isOpen}
  title={t('legal.deleteConfirm')}
  message={t('legal.deleteMessage')}
  variant="danger"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

## Page Component Pattern

```typescript
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import { DataTable } from '@/components/organisms';
import { Select } from '@/components/atoms';
import { getDocumentTypeOptions } from '@/config';
import { logger } from '@/utils/logger';

export default function SomePage() {
  const { t } = useTranslation();
  const options = getDocumentTypeOptions(t);

  // ... fetch data with error handling

  return (
    <ListPageTemplate
      title={t('some.title')}
      filters={<Select options={options} />}
    >
      <DataTable columns={...} data={...} />
    </ListPageTemplate>
  );
}
```

## i18n Namespaces

| Namespace    | Purpose                         |
| ------------ | ------------------------------- |
| common.\*    | Shared UI (save, cancel, etc.)  |
| menu.\*      | Sidebar navigation              |
| auth.\*      | Login page                      |
| dashboard.\* | Dashboard stats                 |
| legal.\*     | Documents, consents, stats      |
| tenants.\*   | Tenant management               |
| audit.\*     | Audit logs                      |
| regions.\*   | Region names (KR, JP, US, etc.) |
| laws.\*      | Law names (PIPA, GDPR, etc.)    |
| consent.\*   | Consent type labels             |

## Styling

- Use `theme-*` Tailwind classes, NO hardcoded colors
- Status: `theme-status-{success,warning,error,info}-{bg,text}`
- Levels: `theme-level-{1-6}` for charts
- Charts: Use `REGION_CHART_COLORS`, `LINE_COLORS` from config

```tsx
// Correct
<div className="bg-theme-bg-card text-theme-text-primary">
<Badge variant="success">Active</Badge>

// Wrong - hardcoded colors
<div className="bg-white text-gray-900">
<span className="text-green-600">Active</span>
```

## Development

```bash
# Start dev server (port 3002)
pnpm --filter @my-girok/web-admin dev

# Build
pnpm --filter @my-girok/web-admin build

# Type check
pnpm --filter @my-girok/web-admin type-check
```

## Admin UI Design Principles

### Priority Order

1. **Information Density** - Maximize data per screen (tables, filters, stats)
2. **Readability** - Clear hierarchy, monospace for IDs, semantic colors
3. **WCAG AAA Compliance** - **IGNORED** for admin (internal tool, training focus)

### Why WCAG AAA is Ignored

- Admin is **internal-only** (authenticated users)
- Designed for **training/learning** purposes
- Prioritizes **data visibility** over accessibility edge cases
- Uses **theme tokens** for Dark Mode support (not raw Tailwind colors)

### Design Guidelines

| Principle           | Implementation                                       |
| ------------------- | ---------------------------------------------------- |
| Dense Tables        | Compact rows, minimal padding, truncated IDs         |
| Inline Actions      | Icon buttons in table cells, no separate action page |
| Collapsible Filters | Show/hide filter panel, badge for active count       |
| Monospace IDs       | `font-mono text-xs` for UUIDs, slugs, resource IDs   |
| Status Badges       | Use `Badge` component with semantic variants         |
| No Pagination Jumps | Simple prev/next, show current range                 |

### Table Cell Patterns

```tsx
// ID column - truncated, monospace
<td className="font-mono text-xs truncate max-w-[150px]">{id}</td>

// Status column - compact badge
<td><Badge variant={statusConfig.variant}>{t(statusConfig.labelKey)}</Badge></td>

// Date column - localized, no year if current year
<td className="text-theme-text-secondary whitespace-nowrap">{formatDate(date)}</td>

// Actions column - icon buttons only
<td>
  <div className="flex items-center gap-1">
    <button className="p-1.5"><Pencil size={14} /></button>
    <button className="p-1.5"><Trash2 size={14} /></button>
  </div>
</td>
```

## Admin Roles

| Role             | Scope  | Permissions                                      |
| ---------------- | ------ | ------------------------------------------------ |
| system_super     | SYSTEM | `*` (all)                                        |
| system_admin     | SYSTEM | tenant:_, user:_, legal:_, content:_, audit:read |
| system_moderator | SYSTEM | content:\*, user:read, audit:read                |
| partner_super    | TENANT | partner_admin:\*, legal:read                     |
| partner_admin    | TENANT | partner_admin:read, legal:read                   |
