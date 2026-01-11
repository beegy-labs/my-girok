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
  chart.config.ts    # Chart colors
  status.config.ts   # Status badge variants
  menu.config.ts     # Sidebar menu
```

## Routes (Updated 2026-01-11)

### Main Routes

| Path                         | Permission    | Component              |
| ---------------------------- | ------------- | ---------------------- |
| `/`                          | -             | DashboardPage          |
| `/login`                     | -             | LoginPage              |
| `/login/mfa`                 | -             | MfaPage                |
| `/services`                  | service:read  | ServicesPage           |
| `/services/:id`              | service:read  | ServiceDetailPage      |
| `/services/:id/consents`     | service:read  | ServiceConsentsPage    |
| `/compliance/documents`      | legal:read    | DocumentsPage          |
| `/compliance/documents/new`  | legal:create  | DocumentEditPage       |
| `/compliance/documents/:id`  | legal:read    | DocumentEditPage       |
| `/compliance/consents`       | legal:read    | ConsentsPage           |
| `/compliance/analytics`      | legal:read    | ConsentStatsPage       |
| `/compliance/regions`        | legal:read    | ConsentExamplesPage    |
| `/organization/partners`     | tenant:read   | TenantsPage            |
| `/organization/partners/:id` | tenant:read   | TenantEditPage         |
| `/system/countries`          | settings:read | SupportedCountriesPage |
| `/system/locales`            | settings:read | SupportedLocalesPage   |
| `/system/audit-logs`         | audit:read    | AuditLogsPage          |
| `/system/settings`           | -             | SettingsPage           |

### Settings Page (MFA & Sessions)

- MFA Setup: QR code + manual secret
- MFA Verification: 6-digit TOTP validation
- Backup Codes: Display, copy, regenerate
- Active Sessions: List + revocation

## Security

```typescript
import { sanitizeSearchInput, sanitizeUrl, logger } from '@/utils';

// Input sanitization
const sanitized = sanitizeSearchInput(userInput);
const url = sanitizeUrl(input);  // null if invalid

// ID display (admin density)
<TruncatedId id={uuid} length={8} showCopy />
truncateUuid('abc12345-...', 8);  // "abc12345..."

// Production-safe logging
logger.error('Operation failed', err);  // No stack in prod

// Use ConfirmDialog, not native confirm()
<ConfirmDialog isOpen variant="danger" onConfirm onCancel />
```

## Styling

```tsx
// Use theme-* classes, NO hardcoded colors
<div className="bg-theme-bg-card text-theme-text-primary">
<Badge variant="success">Active</Badge>

// Table cells
<TruncatedId id={item.id} />                    // ID
<Badge variant={config.variant}>{label}</Badge> // Status
{formatAdminDate(date)}                          // Date
```

## Token Refresh

```typescript
// Single refresh promise prevents race conditions
let refreshPromise: Promise<string> | null = null;

// 401 + valid token -> refresh once, retry all queued
// 401 + no token -> redirect /login
// Refresh fails -> clear auth, redirect /login
```

## OTEL Integration

```typescript
// lib/otel/config.ts
export const otelConfig = {
  serviceName: 'web-admin',
  endpoint: import.meta.env.VITE_OTEL_ENDPOINT,
  samplingRate: import.meta.env.PROD ? 0.1 : 1.0,
};

// hooks/useAuditEvent.ts
const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();
trackButtonClick('create_btn', { serviceId });
trackSearch(query, result.total);
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

| Pattern        | Implementation               |
| -------------- | ---------------------------- |
| Dense Tables   | Compact rows, truncated IDs  |
| Inline Actions | Icon buttons in cells        |
| Monospace IDs  | font-mono text-xs            |
| Status Badges  | Badge with semantic variants |
| Simple Paging  | prev/next only               |

## Commands

```bash
pnpm --filter @my-girok/web-admin dev         # Port 3002
pnpm --filter @my-girok/web-admin build
pnpm --filter @my-girok/web-admin type-check
```

## Environment

```bash
VITE_API_URL=https://my-api-dev.girok.dev/auth
```
