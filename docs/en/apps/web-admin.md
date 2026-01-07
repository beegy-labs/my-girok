# Web Admin Application

> Admin console for Girok H-RBAC multi-tenant system

## Tech Stack

| Technology    | Version | Purpose              |
| ------------- | ------- | -------------------- |
| React         | 19      | UI Framework         |
| Vite          | 7       | Build Tool           |
| TypeScript    | 5       | Type Safety          |
| Zustand       | -       | State Management     |
| react-i18next | -       | Internationalization |
| Tailwind CSS  | 4       | Styling              |
| Recharts      | -       | Charts               |

**Supported Languages**: English, Korean, Japanese, Hindi

## Project Structure

```
src/
  components/
    atoms/        # Basic UI elements
      Button, Input, Select, Badge, Spinner, Card, TruncatedId

    molecules/    # Composed components
      Pagination, SearchInput, StatusBadge, ConfirmDialog, Modal

    organisms/    # Complex components
      PageHeader, DataTable

    templates/    # Page templates
      ListPageTemplate

  config/
    legal.config.ts     # Document types, locales
    tenant.config.ts    # Status, tenant types
    region.config.ts    # Regions, laws, consents
    chart.config.ts     # Chart colors
    status.config.ts    # Status badge variants
    menu.config.ts      # Sidebar menu
```

## Routes & Permissions

| Path                   | Permission     | Component         |
| ---------------------- | -------------- | ----------------- |
| `/`                    | -              | DashboardPage     |
| `/legal/documents`     | legal:read     | DocumentsPage     |
| `/legal/documents/new` | legal:create   | DocumentEditPage  |
| `/legal/documents/:id` | legal:update   | DocumentEditPage  |
| `/legal/consents`      | legal:read     | ConsentsPage      |
| `/tenants`             | tenant:read    | TenantsPage       |
| `/tenants/:id`         | tenant:\*      | TenantEditPage    |
| `/audit-logs`          | audit:read     | AuditLogsPage     |
| `/services`            | service:read   | ServicesPage      |
| `/services/:id`        | service:update | ServiceDetailPage |

## Security Patterns

### Input Sanitization

```typescript
import { sanitizeSearchInput, sanitizeUrl, logger } from '@/utils';

// Sanitize user input
const sanitized = sanitizeSearchInput(userInput);

// Validate and sanitize URLs
const url = sanitizeUrl(input); // Returns null if invalid
```

### ID Display

```typescript
// Truncated UUID display with copy button
<TruncatedId id={uuid} length={8} showCopy />

// Utility function
truncateUuid('abc12345-...', 8);  // Returns "abc12345..."
```

### Production-Safe Logging

```typescript
// No stack traces in production
logger.error('Operation failed', err);
```

### Confirmation Dialogs

```tsx
// Always use ConfirmDialog, never native confirm()
<ConfirmDialog
  isOpen={showConfirm}
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

## Styling Guidelines

### Theme Classes

```tsx
// Use theme-* classes, never hardcoded colors
<div className="bg-theme-bg-card text-theme-text-primary">
  <Badge variant="success">Active</Badge>
</div>
```

### Table Cells

```tsx
// ID column
<TruncatedId id={item.id} />

// Status column
<Badge variant={config.variant}>{label}</Badge>

// Date column
{formatAdminDate(date)}
```

## Token Refresh Flow

```typescript
// Single refresh promise prevents race conditions
let refreshPromise: Promise<string> | null = null;

// 401 + valid token -> refresh once, retry all queued requests
// 401 + no token -> redirect to /login
// Refresh fails -> clear auth state, redirect to /login
```

## OTEL Integration

### Configuration

```typescript
// lib/otel/config.ts
export const otelConfig = {
  serviceName: 'web-admin',
  endpoint: import.meta.env.VITE_OTEL_ENDPOINT,
  samplingRate: import.meta.env.PROD ? 0.1 : 1.0,
};
```

### Usage

```typescript
// hooks/useAuditEvent.ts
const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();

// Track user actions
trackButtonClick('create_btn', { serviceId });
trackSearch(query, result.total);
```

## Role Definitions

| Role             | Scope  | Permissions                    |
| ---------------- | ------ | ------------------------------ |
| system_super     | SYSTEM | \* (all permissions)           |
| system_admin     | SYSTEM | tenant, user, legal, audit     |
| system_moderator | SYSTEM | content, user:read, audit:read |
| partner_super    | TENANT | partner_admin, legal:read      |

## Design Principles

**Priority**: Information Density > Readability > WCAG

> Note: WCAG compliance is relaxed for internal admin interfaces to prioritize efficiency.

| Pattern        | Implementation               |
| -------------- | ---------------------------- |
| Dense Tables   | Compact rows, truncated IDs  |
| Inline Actions | Icon buttons in cells        |
| Monospace IDs  | font-mono text-xs            |
| Status Badges  | Badge with semantic variants |
| Simple Paging  | prev/next only               |

## Environment Variables

```bash
VITE_API_URL=https://my-api-dev.girok.dev/auth
VITE_OTEL_ENDPOINT=https://otel.girok.dev
```

## Commands

```bash
# Development (Port 3002)
pnpm --filter @my-girok/web-admin dev

# Build for production
pnpm --filter @my-girok/web-admin build

# Type checking
pnpm --filter @my-girok/web-admin type-check
```

---

**LLM Reference**: `docs/llm/apps/web-admin.md`
