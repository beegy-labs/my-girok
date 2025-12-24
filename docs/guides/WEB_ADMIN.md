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

### Directory Structure

```
apps/web-admin/src/
├── api/           # API clients (auth, legal, audit, tenant)
├── config/        # Menu configuration (SSOT)
├── components/    # Shared UI components
│   └── Sidebar/   # Hierarchical menu components
├── hooks/         # Custom hooks (useFilteredMenu)
├── layouts/       # Page layouts (AdminLayout)
├── pages/         # Route components
├── stores/        # Zustand stores (auth, menu)
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

## Hierarchical Menu System

The sidebar uses a hierarchical menu with up to 5 levels of nesting.

### Adding a New Menu Item

1. Edit `src/config/menu.config.ts`:

```typescript
export const MENU_CONFIG: MenuItem[] = [
  // ... existing items
  {
    id: 'reports',
    icon: BarChart,
    labelKey: 'menu.reports',
    permission: 'analytics:read',
    children: [
      { id: 'sales', path: '/reports/sales', labelKey: 'menu.salesReport' },
      { id: 'users', path: '/reports/users', labelKey: 'menu.userReport' },
    ],
  },
];
```

2. Add i18n keys to all locale files (`src/i18n/locales/*.json`):

```json
{
  "menu": {
    "reports": "Reports",
    "salesReport": "Sales Report",
    "userReport": "User Report"
  }
}
```

3. Add route in `src/router.tsx`:

```tsx
{
  path: 'reports/sales',
  element: (
    <PrivateRoute permission="analytics:read">
      <SalesReportPage />
    </PrivateRoute>
  ),
}
```

### Menu Item Interface

```typescript
interface MenuItem {
  id: string; // Unique identifier
  path?: string; // Route path (optional for groups)
  icon?: LucideIcon; // Lucide icon component
  labelKey: string; // i18n translation key
  permission?: string; // Required permission
  children?: MenuItem[]; // Nested items
  badge?: 'new' | 'beta'; // Optional badge
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
| `user:read`      | View service users                  |
| `user:update`    | Update service users                |

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

### 2. Add Route

```tsx
// src/router.tsx
import SalesReportPage from './pages/reports/SalesReportPage';

// Inside router config
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

## API Integration

### API Client Structure

```typescript
// src/api/client.ts
const apiClient = axios.create({
  baseURL: '/api/v1/admin',
});

// Automatic token injection
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAdminAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

### Creating API Functions

```typescript
// src/api/reports.ts
import apiClient from './client';

export interface SalesData {
  date: string;
  amount: number;
}

export const reportsApi = {
  getSalesData: async (range: string): Promise<SalesData[]> => {
    const response = await apiClient.get(`/reports/sales?range=${range}`);
    return response.data;
  },
};
```

## Styling Guidelines

### Theme Variables

Use semantic color variables for consistency:

```css
/* Text */
text-theme-text-primary
text-theme-text-secondary
text-theme-text-tertiary

/* Backgrounds */
bg-theme-bg-page
bg-theme-bg-card
bg-theme-bg-secondary

/* Borders */
border-theme-border

/* Interactive */
bg-theme-primary
text-theme-primary
hover:bg-theme-primary/90
```

### Common Patterns

```tsx
// Card container
<div className="bg-theme-bg-card border border-theme-border rounded-xl p-6">

// Page header
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

// Table
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="bg-theme-bg-secondary">
```

## Internationalization

### Adding New Language

1. Create locale file: `src/i18n/locales/{lang}.json`
2. Copy structure from `en.json`
3. Register in `src/i18n/index.ts`

### Translation Keys Convention

```
{namespace}.{section}.{key}

Examples:
- menu.dashboard
- legal.createDocument
- common.save
- audit.beforeState
```

## Testing

### Manual Testing Checklist

1. **Authentication**
   - [ ] Login with valid credentials
   - [ ] Error message for invalid credentials
   - [ ] Redirect to login for protected routes
   - [ ] Token refresh on expiration

2. **Menu Navigation**
   - [ ] All permitted items visible
   - [ ] Hidden items for unpermitted users
   - [ ] Expand/collapse animation
   - [ ] Mobile drawer works

3. **Legal Documents**
   - [ ] List, filter, paginate
   - [ ] Create new document
   - [ ] Edit existing document
   - [ ] Delete (soft delete)

4. **Audit Logs**
   - [ ] Filter by action/resource/admin/date
   - [ ] View state diff modal
   - [ ] CSV export works
   - [ ] Pagination

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

## Related Documentation

- [Auth Service API](./.ai/services/auth-service.md) - Backend API documentation
- [Permission Config](../services/auth-service/src/admin/config/permissions.config.ts) - Permission definitions
- [Design Tokens](./.ai/packages/design-tokens.md) - Styling variables
