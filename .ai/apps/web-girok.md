# Web Girok App

> Public-facing web application | React 19.2, Vite 7.3, TypeScript 5.9, Tailwind 4.1 | **Last Updated**: 2026-01-22

**Stack**: React Router v7, Zustand 5.0, react-i18next

## Key Routes

| Path                              | Description                    |
| --------------------------------- | ------------------------------ |
| `/login`, `/register`             | Auth pages                     |
| `/login/mfa`                      | MFA verification (TOTP/backup) |
| `/auth/callback`                  | OAuth callback handler         |
| `/resume/:username`               | Public resume                  |
| `/resume/my`                      | Resume list (protected)        |
| `/settings`, `/settings/sessions` | Settings, sessions management  |

## Auth Pattern

```typescript
publicApi; // No 401 interceptor (login)
authApi; // Has 401 interceptor (auto-refresh)

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

## Performance

- `React.lazy()` for routes (code splitting)
- `useCallback`/`useMemo` for handlers
- Static constants outside components
- Direct navigation (no state-based)

**SSOT**: `docs/llm/apps/web-girok.md`
