# web-admin

> Admin console for Girok H-RBAC multi-tenant system | **Last Updated**: 2026-01-14

## Quick Reference

| Item   | Value                                               |
| ------ | --------------------------------------------------- |
| Port   | 3002                                                |
| Stack  | React 19, Vite 7, TypeScript 5, Zustand, Tailwind 4 |
| i18n   | react-i18next (en, ko, ja, hi)                      |
| Toast  | sonner (3KB, accessible)                            |
| Editor | Monaco Editor (DSL syntax highlighting)             |

## Key Routes

| Path                         | Component             | Permission   |
| ---------------------------- | --------------------- | ------------ |
| `/`                          | DashboardPage         | -            |
| `/compliance/documents`      | DocumentsPage         | legal:read   |
| `/compliance/consents`       | ConsentsPage          | legal:read   |
| `/organization/partners`     | TenantsPage           | tenant:read  |
| `/system/settings`           | SettingsPage          | -            |
| `/system/audit-logs`         | AuditLogsPage         | audit:read   |
| `/system/session-recordings` | SessionRecordingsPage | session:read |
| `/system/session-analytics`  | SessionAnalyticsPage  | session:read |

## Architecture

| Pattern      | Implementation                                        |
| ------------ | ----------------------------------------------------- |
| Components   | Atomic Design (atoms/molecules/organisms/templates)   |
| Config       | SSOT in `src/config/` (legal, tenant, region, status) |
| Auth         | Token refresh with queue, MFA support                 |
| Styling      | theme-\* classes, NO hardcoded colors                 |
| Errors       | Centralized handler with retry, classification        |
| Toast        | sonner with AppError integration, auto-show on errors |
| Code Editors | Monaco Editor for DSL (auth policies)                 |

## Analytics & Monitoring

| Feature          | Implementation                                      |
| ---------------- | --------------------------------------------------- |
| Session Replay   | rrweb player with controls (@my-girok/tracking-sdk) |
| Analytics Charts | Recharts (PieChart for devices, BarChart for pages) |
| Version Notes    | Optional notes for authorization model versions     |
| Visualizations   | Device breakdown, top pages, session trends         |

## Settings Page Features

- MFA Setup (QR code + TOTP verification)
- Backup Codes (display, copy, regenerate)
- Active Sessions (list, revoke)

## Development

```bash
pnpm --filter @my-girok/web-admin dev    # Start (port 3002)
pnpm --filter @my-girok/web-admin build  # Build
```

**SSOT**: `docs/llm/apps/web-admin.md`
**Error Handling**: `docs/llm/guides/frontend-error-handling.md`
**Toast System**: `docs/llm/guides/toast-notifications.md`
**Monaco Editor**: `docs/llm/guides/monaco-editor.md`
**Session Replay**: `@my-girok/tracking-sdk` (SessionPlayer component)
