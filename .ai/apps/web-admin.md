# web-admin - Admin Console Application

> Girok Admin Console for managing legal documents, tenants, and user consents

## Overview

- **Framework**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS 4 + Design Tokens
- **State**: Zustand
- **Editor**: TipTap (WYSIWYG Markdown)
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
│   │   ├── legal.ts             # Legal document API
│   │   └── tenant.ts            # Tenant API
│   ├── components/              # Shared components
│   │   ├── PrivateRoute.tsx     # Auth guard
│   │   └── MarkdownEditor.tsx   # TipTap editor
│   ├── contexts/
│   │   └── ThemeContext.tsx     # Light/dark theme
│   ├── layouts/
│   │   └── AdminLayout.tsx      # Sidebar + header layout
│   ├── pages/
│   │   ├── LoginPage.tsx        # Admin login
│   │   ├── DashboardPage.tsx    # Stats overview
│   │   ├── legal/
│   │   │   ├── DocumentsPage.tsx    # Document list
│   │   │   ├── DocumentEditPage.tsx # Create/edit document
│   │   │   └── ConsentsPage.tsx     # Consent statistics
│   │   └── tenants/
│   │       ├── TenantsPage.tsx      # Tenant list
│   │       └── TenantEditPage.tsx   # Create/edit tenant
│   ├── stores/
│   │   └── adminAuthStore.ts    # Admin auth state
│   └── i18n/                    # Internationalization
├── vite.config.ts
├── tsconfig.json
└── package.json
```

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

### Permission-Based Navigation

```tsx
// AdminLayout.tsx
const navItems = [
  { path: '/legal/documents', permission: 'legal:read' },
  { path: '/tenants', permission: 'tenant:read' },
];

// Only show items user has permission for
{
  navItems.filter((item) => !item.permission || hasPermission(item.permission));
}
```

### Protected Routes

```tsx
// router.tsx
<Route
  path="legal/documents"
  element={
    <PrivateRoute permission="legal:read">
      <DocumentsPage />
    </PrivateRoute>
  }
/>
```

## API Integration

```typescript
// Base URL: /api/v1/admin
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

// Automatic token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token flow...
    }
  },
);
```

## MarkdownEditor Component

```tsx
import MarkdownEditor from './components/MarkdownEditor';

<MarkdownEditor
  value={content}
  onChange={setContent}
  showPreview={previewMode}
  placeholder="Write document content..."
/>;

// Features:
// - TipTap WYSIWYG editor
// - Toolbar: Bold, Italic, Headings, Lists, Code, Quote
// - Preview mode toggle
// - Undo/Redo
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

## Environment Variables

```env
# Vite proxy forwards /api to backend
VITE_API_URL=http://localhost:3001
```

## Design System

Uses shared design tokens:

- `@my-girok/design-tokens` - CSS variables
- `@my-girok/ui-components` - (optional) shared components

```css
/* Theme variables */
--theme-bg-page
--theme-bg-card
--theme-text-primary
--theme-text-secondary
--theme-primary
--theme-error
--btn-primary-text-color
```

## Admin Roles

| Role             | Scope  | Permissions                          |
| ---------------- | ------ | ------------------------------------ |
| system_super     | SYSTEM | `*` (all)                            |
| system_admin     | SYSTEM | tenant:_, user:_, legal:_, content:_ |
| system_moderator | SYSTEM | content:\*, user:read                |
| partner_super    | TENANT | partner_admin:\*, legal:read         |
| partner_admin    | TENANT | partner_admin:read, legal:read       |
| partner_editor   | TENANT | analytics:read                       |

## Pages Overview

### Dashboard

- Summary statistics cards
- Consent by type chart
- Recent activity timeline

### Legal Documents

- Filterable document list (type, locale, status)
- Create/edit with Markdown editor
- Soft delete (set isActive=false)

### Consents

- Statistics by type and region
- Recent activity table
- Export CSV (TODO)

### Tenants

- Partner organization list
- Status management (PENDING → ACTIVE → SUSPENDED → TERMINATED)
- Admin count display
