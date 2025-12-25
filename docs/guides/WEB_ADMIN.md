# Web Admin Console Guide

This guide covers the Girok Admin Console application for managing legal documents, tenants, user consents, and audit logs.

## Overview

The web-admin application is a React-based admin console that provides:

- **Legal Document Management**: Create and manage terms of service, privacy policies, and marketing consent documents
- **Consent Statistics**: Visualize user consent rates with interactive charts
- **Tenant Management**: Manage partner organizations and their admins
- **Audit Logging**: Track all admin actions with before/after state comparison
- **Multi-language Support**: English, Korean, Japanese, and Hindi

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- Access to auth-service backend

### Development

```bash
# Start development server (port 3002)
pnpm --filter @my-girok/web-admin dev

# Build for production
pnpm --filter @my-girok/web-admin build

# Type check
pnpm --filter @my-girok/web-admin type-check
```

### Default Credentials

For local development, use these seeded admin accounts:

| Username     | Password       | Role         |
| ------------ | -------------- | ------------ |
| super_admin  | SuperAdmin123! | system_super |
| system_admin | SystemAdmin1!  | system_admin |

## Architecture

### Atomic Design Pattern

We use Atomic Design for component organization:

```
apps/web-admin/src/components/
├── atoms/        # Button, Input, Select, Badge, Spinner, Card
├── molecules/    # Pagination, SearchInput, ConfirmDialog, Modal, FilterBar
├── organisms/    # PageHeader, DataTable
└── templates/    # ListPageTemplate
```

### SSOT Configuration

Centralized configuration in `src/config/`:

| File               | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `legal.config.ts`  | Document types, locales, helper functions  |
| `tenant.config.ts` | Tenant statuses, types with badge variants |
| `region.config.ts` | Regions, laws, consent requirements        |
| `chart.config.ts`  | Chart colors using theme tokens            |
| `status.config.ts` | Status badge mappings                      |
| `menu.config.ts`   | Sidebar menu structure                     |

### React 2025 Best Practices

- **Lazy Loading**: All page components lazy-loaded with `React.lazy()`
- **Error Boundaries**: `ErrorBoundary` + `PageErrorBoundary` for error isolation
- **Suspense**: Loading states with Spinner fallback
- **useCallback/useMemo**: Memoized handlers and computed values
- **Custom Hooks**: `useFetch` for data fetching pattern

### Directory Structure

```
apps/web-admin/src/
├── api/           # API clients (auth, legal, audit, tenant)
├── config/        # SSOT configuration files
├── components/    # Atomic design components
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   ├── templates/
│   ├── ErrorBoundary.tsx
│   └── PageErrorBoundary.tsx
├── hooks/         # Custom hooks (useFetch, useFilteredMenu)
├── layouts/       # Page layouts (AdminLayout)
├── pages/         # Route components
├── stores/        # Zustand stores (auth, menu)
├── utils/         # Utilities (logger, sanitize)
└── i18n/          # Translation files
```

### Key Technologies

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

## Security Guidelines

### No Native Dialogs

Never use native `confirm()` or `prompt()`:

```typescript
// Wrong
if (confirm('Delete?')) { ... }
const reason = prompt('Reason:');

// Correct - use ConfirmDialog or Modal components
<ConfirmDialog
  isOpen={deleteDialog.isOpen}
  title={t('legal.deleteConfirm')}
  message={t('legal.deleteMessage')}
  variant="danger"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

### Input Sanitization

Use utility functions for user input:

```typescript
import { sanitizeSearchInput } from '@/utils/sanitize';

const handleSearch = (input: string) => {
  const sanitized = sanitizeSearchInput(input);
  fetchData(sanitized);
};
```

### Production-Safe Logging

Use the logger utility instead of console.error:

```typescript
import { logger } from '@/utils/logger';

try {
  await api.doSomething();
} catch (err) {
  setError(t('some.errorMessage'));
  logger.error('Operation failed', err); // No stack trace in production
}
```

## Permission System

### How Permissions Work

- Permissions use `resource:action` pattern (e.g., `legal:read`, `tenant:create`)
- Wildcards supported: `legal:*` (all legal actions), `*` (super admin)
- Parent menu items visible if ANY child is visible
- Routes protected with `PrivateRoute` component

### Available Permissions

| Permission       | Description                         |
| ---------------- | ----------------------------------- |
| `legal:read`     | View legal documents and consents   |
| `legal:create`   | Create new legal documents          |
| `legal:update`   | Edit legal documents                |
| `legal:delete`   | Delete legal documents              |
| `tenant:read`    | View partner organizations          |
| `tenant:create`  | Create new partners                 |
| `tenant:update`  | Update partner details              |
| `tenant:approve` | Approve/reject partner applications |
| `audit:read`     | View audit logs                     |

### Checking Permissions in Code

```typescript
const { hasPermission } = useAdminAuthStore();

// Single permission
if (hasPermission('legal:create')) {
  // Show create button
}

// Wildcard
if (hasPermission('legal:*')) {
  // Has all legal permissions
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
      <h1 className="text-2xl font-bold text-theme-text-primary">{t('reports.salesTitle')}</h1>
      {/* Page content */}
    </div>
  );
}
```

### 2. Add Route with Lazy Loading

```tsx
// src/router.tsx
const SalesReportPage = lazy(() => import('./pages/reports/SalesReportPage'));

// Inside routes config (within PageWrapper children)
{
  path: 'reports/sales',
  element: (
    <PrivateRoute permission="analytics:read">
      <SalesReportPage />
    </PrivateRoute>
  ),
}
```

### 3. Add Menu Item

```typescript
// src/config/menu.config.ts
{ id: 'sales', path: '/reports/sales', labelKey: 'menu.salesReport' }
```

### 4. Add Translations

```json
// src/i18n/locales/en.json
{
  "menu": {
    "salesReport": "Sales Report"
  },
  "reports": {
    "salesTitle": "Sales Report"
  }
}
```

Remember to add to all 4 locale files: en.json, ko.json, ja.json, hi.json

## Styling Guidelines

### Theme Variables

Always use semantic color variables, never raw colors:

```css
/* Correct */
text-theme-text-primary
bg-theme-bg-card
border-theme-border
bg-theme-status-success-bg
text-theme-status-success-text

/* Wrong */
text-gray-900
bg-white
border-gray-200
bg-green-100
text-green-600
```

### Status Badge Variants

| Variant   | Use For           |
| --------- | ----------------- |
| `success` | Active, approved  |
| `warning` | Pending           |
| `error`   | Suspended, failed |
| `info`    | Information       |
| `default` | Neutral           |

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
```

### Chart Colors

Use theme tokens for charts:

```typescript
import { REGION_CHART_COLORS, LINE_COLORS } from '@/config';

<Cell fill={REGION_CHART_COLORS[region]} />
<Line stroke={LINE_COLORS.agreed} />
```

## Internationalization

### Supported Locales

- `en` - English
- `ko` - Korean
- `ja` - Japanese
- `hi` - Hindi

### Translation Keys Convention

```
{namespace}.{section}.{key}

Examples:
- menu.dashboard
- legal.deleteConfirm
- common.save
- tenants.suspendMessage
```

### Adding New Keys

1. Add to `src/i18n/locales/en.json` first
2. Copy to ko.json, ja.json, hi.json
3. Use `t('namespace.key')` in components

## Troubleshooting

### Common Issues

**Menu not updating after permission change**

- Clear localStorage: `localStorage.removeItem('admin-auth-storage')`
- Refresh page

**API calls failing with 401**

- Check if accessToken is valid
- Verify backend is running
- Check CORS configuration

**Translations not showing**

- Verify key exists in all locale files
- Check for typos in translation key
- Restart dev server after adding new keys

**Page crashes**

- Error boundary will catch and display error UI
- Check browser console in development mode
- Review logger output for details

## Related Documentation

- [.ai/apps/web-admin.md](../../.ai/apps/web-admin.md) - LLM-optimized quick reference
- [.ai/packages/design-tokens.md](../../.ai/packages/design-tokens.md) - Design tokens documentation
- [.ai/services/auth-service.md](../../.ai/services/auth-service.md) - Auth service API
