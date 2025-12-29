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
├── atoms/        # Button, Input, Select, Badge, Spinner, Card, TruncatedId
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
import { sanitizeSearchInput, sanitizeUrl } from '@/utils/sanitize';

const sanitized = sanitizeSearchInput(userInput);
const url = sanitizeUrl(input); // Returns null if invalid/dangerous
```

### ID Display (Admin Density)

```typescript
import { TruncatedId } from '@/components/atoms';
import { truncateUuid, formatAdminDate } from '@/utils/sanitize';

// Component (with copy button)
<TruncatedId id={uuid} length={8} showCopy />

// Utility functions
truncateUuid('abc12345-...', 8);  // "abc12345..."
formatAdminDate(date);            // "Dec 25" or "Dec 25, 2024"
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

## API Client Authentication

### Token Refresh Pattern

```typescript
// src/api/client.ts
// Single refresh promise prevents race conditions
let refreshPromise: Promise<string> | null = null;

// Multiple 401 responses wait for same refresh
if (isRefreshing && refreshPromise) {
  const token = await refreshPromise;
  return retryRequest(token);
}
```

### Key Points

| Scenario          | Behavior                                |
| ----------------- | --------------------------------------- |
| 401 + valid token | Refresh once, retry all queued requests |
| 401 + no token    | Redirect to /login immediately          |
| Refresh fails     | Clear auth, redirect to /login          |
| During redirect   | Block all new requests (axios.Cancel)   |

### Environment

```bash
# .env (gitignored)
VITE_API_URL=https://my-api-dev.girok.dev/auth

# Default fallback in code
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://my-api-dev.girok.dev/auth';
```

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
// ID column - use TruncatedId component (copy on click)
<td><TruncatedId id={item.id} /></td>

// Status column - compact badge
<td><Badge variant={statusConfig.variant}>{t(statusConfig.labelKey)}</Badge></td>

// Date column - localized, no year if current year
<td className="text-theme-text-secondary whitespace-nowrap">{formatAdminDate(date)}</td>

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

## OTEL Integration (#415-#420)

### Browser SDK Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (web-admin)                   │
├─────────────────────────────────────────────────────────┤
│  lib/otel/                                               │
│  ├── config.ts      Environment-based configuration      │
│  ├── session.ts     30-minute session management         │
│  ├── tracer.ts      WebTracerProvider initialization     │
│  └── index.ts       Barrel export                        │
├─────────────────────────────────────────────────────────┤
│  hooks/                                                   │
│  └── useAuditEvent.ts  Event tracking hook               │
│      - trackButtonClick(name, metadata)                  │
│      - trackFormSubmit(formId, success, duration)        │
│      - trackTabChange(from, to)                          │
│      - trackSearch(query, resultCount)                   │
└─────────────────────────────────────────────────────────┘
              │
              ▼ OTLP (protobuf)
┌─────────────────────────────────────────────────────────┐
│              OTEL Collector (Kubernetes)                  │
│  - Receives browser spans                                │
│  - Batch processing                                       │
│  - Export to ClickHouse                                   │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                  ClickHouse audit_db                      │
│  - admin_ui_events (7yr retention)                       │
│  - admin_api_logs (7yr retention)                        │
│  - admin_sessions (2yr retention)                        │
└─────────────────────────────────────────────────────────┘
```

### OTEL Configuration

```typescript
// lib/otel/config.ts
export const otelConfig = {
  serviceName: 'web-admin',
  serviceVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  endpoint: import.meta.env.VITE_OTEL_ENDPOINT || 'https://otel.girok.dev',
  samplingRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
};
```

### useAuditEvent Hook Usage

```typescript
import { useAuditEvent } from '@/hooks';

function MyComponent() {
  const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();

  // Track button click
  const handleClick = () => {
    trackButtonClick('create_sanction_btn', { serviceId });
    doSomething();
  };

  // Track search with result count
  const handleSearch = async () => {
    const result = await api.search(query);
    trackSearch(query, result.total); // Always track AFTER results
    setData(result.items);
  };
}
```

## Service Management Routes

| Path                        | Component           | Permission     |
| --------------------------- | ------------------- | -------------- |
| `/services`                 | ServicesPage        | service:read   |
| `/services/:id`             | ServiceDetailPage   | service:read   |
| `/services/:id` (Config)    | ServiceConfigTab    | service:update |
| `/services/:id` (Features)  | ServiceFeaturesTab  | service:update |
| `/services/:id` (Testers)   | ServiceTestersTab   | service:update |
| `/services/:id` (Audit)     | ServiceAuditTab     | audit:read     |
| `/services/:id` (Countries) | ServiceCountriesTab | service:update |
| `/services/:id` (Locales)   | ServiceLocalesTab   | service:update |
