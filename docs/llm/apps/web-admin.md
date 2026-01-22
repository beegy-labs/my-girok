# web-admin

Admin console for Girok H-RBAC multi-tenant system

## Stack

```yaml
Port: 3002
Framework: React 19, Vite 7, TypeScript 5
State: Zustand
i18n: react-i18next (en, ko, ja, hi)
Styling: Tailwind 4 + design-tokens
Charts: Recharts
```

## Structure

```
src/components/
  atoms/      # Button, Input, Select, Badge, Spinner, Card, TruncatedId
  molecules/  # Pagination, SearchInput, StatusBadge, ConfirmDialog, Modal
  organisms/  # PageHeader, DataTable
  templates/  # ListPageTemplate

src/config/
  legal.config.ts    # Document types, locales
  tenant.config.ts   # Status, tenant types
  region.config.ts   # Regions, laws, consents
  menu.config.ts     # Sidebar menu
```

## Security

```typescript
import { sanitizeSearchInput, sanitizeUrl, logger } from '@/utils';

// Input sanitization
const sanitized = sanitizeSearchInput(userInput);

// ID display (admin density)
<TruncatedId id={uuid} length={8} showCopy />

// Use ConfirmDialog, not native confirm()
<ConfirmDialog isOpen variant="danger" onConfirm onCancel />
```

## Styling

```tsx
// Use theme-* classes, NO hardcoded colors
<div className="bg-theme-bg-card text-theme-text-primary">
<Badge variant="success">Active</Badge>
```

## Roles

| Role             | Scope  | Permissions                    |
| ---------------- | ------ | ------------------------------ |
| system_super     | SYSTEM | \* (all)                       |
| system_admin     | SYSTEM | tenant, user, legal, audit     |
| system_moderator | SYSTEM | content, user:read, audit:read |
| partner_super    | TENANT | partner_admin, legal:read      |

## Design Principles

Priority: Information Density > Readability > WCAG (ignored for internal admin)

## Commands

```bash
pnpm --filter @my-girok/web-admin dev         # Port 3002
pnpm --filter @my-girok/web-admin build
pnpm --filter @my-girok/web-admin type-check
```

## Related Documentation

- **Routes & Features**: `web-admin-routes.md`
- [Design Tokens](../packages/design-tokens.md)
