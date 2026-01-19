# web-admin

> Admin console for Girok H-RBAC multi-tenant system | Port: 3002 | **Last Updated**: 2026-01-17

**Stack**: React 19, Vite 7, TypeScript 5, Zustand, Tailwind 4, sonner (toast), Monaco Editor

## Key Routes

| Path                         | Component             | Permission    |
| ---------------------------- | --------------------- | ------------- |
| `/compliance/documents`      | DocumentsPage         | legal:read    |
| `/compliance/consents`       | ConsentsPage          | legal:read    |
| `/organization/partners`     | TenantsPage           | tenant:read   |
| `/system/oauth`              | OAuthSettingsPage     | settings:read |
| `/system/audit-logs`         | AuditLogsPage         | audit:read    |
| `/system/session-recordings` | SessionRecordingsPage | session:read  |
| `/system/session-analytics`  | SessionAnalyticsPage  | session:read  |

## Architecture

| Pattern      | Implementation                                   |
| ------------ | ------------------------------------------------ |
| Components   | Atomic Design (atoms/molecules/organisms)        |
| Config       | SSOT in `src/config/` (legal, tenant, region)    |
| Auth         | Token refresh queue, MFA support                 |
| Styling      | theme-\* classes (NO hardcoded colors)           |
| Errors       | Centralized handler with AppError classification |
| Toast        | sonner with auto-show on errors                  |
| Code Editors | Monaco Editor for DSL (auth policies)            |

## Features

| Feature        | Implementation                        |
| -------------- | ------------------------------------- |
| Session Replay | rrweb player (@my-girok/tracking-sdk) |
| Analytics      | Recharts (Pie/Bar charts)             |
| MFA            | QR code, TOTP, backup codes           |

## Commands

```bash
pnpm --filter @my-girok/web-admin dev    # Port 3002
pnpm --filter @my-girok/web-admin build
```

**SSOT**: `docs/llm/apps/web-admin.md`, `docs/llm/apps/web-admin-oauth.md`, `docs/llm/guides/frontend-error-handling.md`
