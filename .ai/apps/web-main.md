# Web Main App

> Public-facing web application for My-Girok | **Last Updated**: 2026-01-11

## Quick Reference

| Item   | Value                                              |
| ------ | -------------------------------------------------- |
| Stack  | React 19.2, Vite 7.2, TypeScript 5.9, Tailwind 4.1 |
| Router | React Router v7                                    |
| State  | Zustand 5.0                                        |
| i18n   | react-i18next                                      |

## Key Routes

| Path                  | Description                    |
| --------------------- | ------------------------------ |
| `/login`, `/register` | Auth pages                     |
| `/login/mfa`          | MFA verification (TOTP/backup) |
| `/auth/callback`      | OAuth callback handler         |
| `/resume/:username`   | Public resume                  |
| `/resume/my`          | Resume list (protected)        |
| `/settings`           | User settings (MFA, security)  |
| `/settings/sessions`  | Active sessions management     |

## Auth Pattern

```typescript
// Two axios instances
publicApi; // No 401 interceptor (login)
authApi; // Has 401 interceptor (auto-refresh)

// Auth Store with MFA
interface AuthState {
  user: User | null;
  mfaChallenge: { challengeId: string; availableMethods: string[] } | null;
}
```

## OAuth Callback Flow

```
/auth/callback?status=xxx
├── success      → Fetch user, redirect
├── mfa_required → Store challenge, /login/mfa
├── error        → Show error
└── not_implemented → Provider unavailable
```

## Performance Rules

- `useCallback`/`useMemo` for handlers and expensive ops
- Static constants outside components
- Direct navigation (no state-based)

**SSOT**: `docs/llm/apps/web-main.md`
