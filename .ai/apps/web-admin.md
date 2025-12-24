# web-admin - Admin Console Application

> Girok Admin Console for managing legal documents, tenants, audit logs, and user consents

## Overview

- **Framework**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS 4 + Design Tokens
- **State**: Zustand
- **Editor**: TipTap (WYSIWYG Markdown)
- **Charts**: Recharts
- **Port**: 3002 (dev server)

## Directory Structure

```
apps/web-admin/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── router.tsx               # React Router config
│   ├── index.css                # Global styles
│   ├── api/                     # API clients
│   │   ├── client.ts            # Axios instance with interceptors
│   │   ├── auth.ts              # Admin auth API
│   │   ├── audit.ts             # Audit log API
│   │   ├── legal.ts             # Legal document API
│   │   └── tenant.ts            # Tenant API
│   ├── config/
│   │   └── menu.config.ts       # SSOT menu configuration
│   ├── components/
│   │   ├── PrivateRoute.tsx     # Auth guard
│   │   ├── MarkdownEditor.tsx   # TipTap editor
│   │   └── Sidebar/
│   │       ├── Sidebar.tsx      # Main sidebar wrapper
│   │       └── MenuItem.tsx     # Recursive menu item
│   ├── contexts/
│   │   └── ThemeContext.tsx     # Light/dark theme
│   ├── hooks/
│   │   └── useFilteredMenu.ts   # Permission-based menu filtering
│   ├── layouts/
│   │   └── AdminLayout.tsx      # Sidebar + header layout
│   ├── pages/
│   │   ├── LoginPage.tsx        # Admin login
│   │   ├── DashboardPage.tsx    # Stats overview
│   │   ├── AuditLogsPage.tsx    # Audit log viewer
│   │   ├── legal/
│   │   │   ├── DocumentsPage.tsx       # Document list
│   │   │   ├── DocumentEditPage.tsx    # Create/edit document
│   │   │   ├── ConsentsPage.tsx        # User consents list
│   │   │   ├── ConsentStatsPage.tsx    # Consent statistics charts
│   │   │   └── ConsentExamplesPage.tsx # Country-based examples
│   │   └── tenants/
│   │       ├── TenantsPage.tsx         # Tenant list
│   │       └── TenantEditPage.tsx      # Create/edit tenant
│   ├── stores/
│   │   ├── adminAuthStore.ts    # Admin auth state
│   │   └── menuStore.ts         # Menu expanded state
│   └── i18n/                    # Internationalization (en, ko, ja, hi)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Hierarchical Menu System

### Menu Configuration (SSOT)

```typescript
// src/config/menu.config.ts
export interface MenuItem {
  id: string;
  path?: string; // Optional for group headers
  icon?: LucideIcon;
  labelKey: string; // i18n key
  permission?: string; // Permission check
  children?: MenuItem[]; // Nested items (max 5 depth)
  badge?: 'new' | 'beta';
}

export const MENU_CONFIG: MenuItem[] = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, labelKey: 'menu.dashboard' },
  {
    id: 'legal',
    icon: Scale,
    labelKey: 'menu.legal',
    permission: 'legal:read',
    children: [
      { id: 'documents', path: '/legal/documents', labelKey: 'menu.legalDocuments' },
      { id: 'consents', path: '/legal/consents', labelKey: 'menu.consents' },
      { id: 'stats', path: '/legal/consent-stats', labelKey: 'menu.consentStats', badge: 'new' },
      { id: 'examples', path: '/legal/examples', labelKey: 'menu.countryExamples' },
    ],
  },
  {
    id: 'tenants',
    path: '/tenants',
    icon: Building2,
    labelKey: 'menu.tenants',
    permission: 'tenant:read',
  },
  {
    id: 'audit',
    path: '/audit-logs',
    icon: ClipboardList,
    labelKey: 'menu.auditLogs',
    permission: 'audit:read',
  },
  { id: 'settings', path: '/settings', icon: Settings, labelKey: 'menu.settings' },
];

export const MAX_MENU_DEPTH = 5;
```

### Permission-Based Filtering

```typescript
// src/hooks/useFilteredMenu.ts
function filterItems(items: MenuItem[]): MenuItem[] {
  return items
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterItems(item.children);
        // Parent visible if ANY child visible
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
      }
      // Leaf node: check permission
      if (item.permission && !hasPermission(item.permission)) {
        return null;
      }
      return item;
    })
    .filter(Boolean);
}
```

### Menu State Store

```typescript
// src/stores/menuStore.ts
interface MenuState {
  expandedItems: string[];
  isMobileOpen: boolean;
  toggleItem: (id: string) => void;
  setMobileOpen: (open: boolean) => void;
}

// Persisted to localStorage
```

## Routes

| Path                   | Permission    | Component           |
| ---------------------- | ------------- | ------------------- |
| `/`                    | -             | DashboardPage       |
| `/login`               | -             | LoginPage           |
| `/legal/documents`     | legal:read    | DocumentsPage       |
| `/legal/documents/new` | legal:create  | DocumentEditPage    |
| `/legal/documents/:id` | legal:read    | DocumentEditPage    |
| `/legal/consents`      | legal:read    | ConsentsPage        |
| `/legal/consent-stats` | legal:read    | ConsentStatsPage    |
| `/legal/examples`      | legal:read    | ConsentExamplesPage |
| `/tenants`             | tenant:read   | TenantsPage         |
| `/tenants/new`         | tenant:create | TenantEditPage      |
| `/tenants/:id`         | tenant:read   | TenantEditPage      |
| `/audit-logs`          | audit:read    | AuditLogsPage       |

## Key Features

### Authentication

```typescript
// Admin JWT stored in Zustand with persistence
const { admin, hasPermission } = useAdminAuthStore();

// Permission check
if (hasPermission('legal:create')) {
  // Can create legal documents
}

// Wildcard support
hasPermission('legal:*'); // All legal permissions
hasPermission('*'); // Super admin (all permissions)
```

### Protected Routes

```tsx
// router.tsx
<PrivateRoute permission="legal:read">
  <DocumentsPage />
</PrivateRoute>
```

## API Integration

```typescript
// Base URL: /api/v1/admin
const apiClient = axios.create({
  baseURL: '/api/v1/admin',
});

// Automatic token injection & refresh on 401
```

## i18n Keys

```json
{
  "menu": {
    "dashboard": "Dashboard",
    "legal": "Legal",
    "legalDocuments": "Documents",
    "consents": "Consents",
    "consentStats": "Statistics",
    "countryExamples": "Country Examples",
    "tenants": "Partners",
    "auditLogs": "Audit Logs",
    "settings": "Settings"
  },
  "audit": {
    "title": "Audit Logs",
    "action": "Action",
    "resource": "Resource",
    "admin": "Admin",
    "date": "Date",
    "stateChanges": "State Changes"
  }
}
```

Supported locales: `en`, `ko`, `ja`, `hi`

## Development

```bash
# Start dev server (port 3002)
pnpm --filter @my-girok/web-admin dev

# Build
pnpm --filter @my-girok/web-admin build

# Type check
pnpm --filter @my-girok/web-admin type-check
```

## Admin Roles

| Role             | Scope  | Permissions                                      |
| ---------------- | ------ | ------------------------------------------------ |
| system_super     | SYSTEM | `*` (all)                                        |
| system_admin     | SYSTEM | tenant:_, user:_, legal:_, content:_, audit:read |
| system_moderator | SYSTEM | content:\*, user:read, audit:read                |
| partner_super    | TENANT | partner_admin:\*, legal:read                     |
| partner_admin    | TENANT | partner_admin:read, legal:read                   |

## Pages Overview

### Dashboard

- Summary statistics cards
- Consent by type chart
- Recent activity timeline

### Legal Documents

- Filterable document list (type, locale, status)
- Create/edit with Markdown editor
- Soft delete (set isActive=false)

### Consent Statistics

- Bar chart: Consent rates by type
- Pie chart: Regional distribution (KR, JP, US, GB, IN)
- Line chart: Time-based trends (7d, 30d, 90d)
- CSV export

### Country Examples

- Region selector (KR, JP, EU, US, IN)
- Law name display (PIPA, APPI, GDPR, CCPA, DPDP)
- Required vs optional consents
- Night-time push restrictions

### Audit Logs

- Filterable log list (action, resource, admin, date range)
- Before/after state diff viewer (JSON)
- CSV export
- Pagination

### Tenants

- Partner organization list
- Status management (PENDING → ACTIVE → SUSPENDED → TERMINATED)
- Admin count display
