# Web-Admin - Routes & Features

This document covers route tables, token refresh mechanism, and OpenTelemetry integration.

**Updated**: 2026-01-11

## Routes

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

### Settings Page Features

The Settings page (`/system/settings`) includes:

**MFA Setup**:

- QR code display for authenticator apps
- Manual secret entry option

**MFA Verification**:

- 6-digit TOTP validation

**Backup Codes**:

- Display backup codes
- Copy to clipboard
- Regenerate codes

**Active Sessions**:

- List all active sessions
- Session revocation

## Token Refresh

The application implements a robust token refresh mechanism:

```typescript
// Single refresh promise prevents race conditions
let refreshPromise: Promise<string> | null = null;

// Behavior:
// - 401 + valid token -> refresh once, retry all queued requests
// - 401 + no token -> redirect to /login
// - Refresh fails -> clear auth, redirect to /login
```

### Key Features

- **Race Condition Prevention**: Single refresh promise shared across concurrent requests
- **Request Queuing**: Failed requests are queued and retried after token refresh
- **Automatic Cleanup**: Invalid sessions are cleared and redirected to login

## OpenTelemetry Integration

### Configuration

**File**: `lib/otel/config.ts`

```typescript
export const otelConfig = {
  serviceName: 'web-admin',
  endpoint: import.meta.env.VITE_OTEL_ENDPOINT,
  samplingRate: import.meta.env.PROD ? 0.1 : 1.0,
};
```

### Audit Event Tracking

**File**: `hooks/useAuditEvent.ts`

```typescript
const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();

// Usage examples:
trackButtonClick('create_btn', { serviceId });
trackSearch(query, result.total);
```

### Tracked Events

- Button clicks with context
- Form submissions
- Search queries with result counts

## Environment Variables

```bash
VITE_API_URL=https://my-api-dev.girok.dev/auth
```

---

**Main Document**: [web-admin.md](web-admin.md)

---

_This document is auto-generated from `docs/llm/apps/web-admin-routes.md`_
