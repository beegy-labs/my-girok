# web-admin - Routes & Features

> Route table, token refresh, and OTEL integration

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

## Environment

```bash
VITE_API_URL=https://my-api-dev.girok.dev/auth
```

---

_Main: `web-admin.md`_
