# @my-girok/auth-utils

Shared authentication utilities for frontend apps (session-based BFF pattern).

## Exports

### createAuthStore

Creates a Zustand store with authentication state management.

```typescript
interface BaseAuthState<TUser> {
  user: TUser | null;
  isAuthenticated: boolean;
  mfaChallenge: MfaChallenge | null;
  setAuth: (user: TUser) => void;
  setMfaChallenge: (challengeId: string, methods: string[]) => void;
  clearMfaChallenge: () => void;
  clearAuth: () => void;
}

// Basic usage
const useAuthStore = createAuthStore<UserInfo>({
  storageName: 'auth-storage',
});

// Extended usage with custom methods
const useAdminAuthStore = createExtendedAuthStore<AdminInfo, AdminExtensions>({
  storageName: 'admin-auth-storage',
  extend: (set, get) => ({
    hasPermission: (required) => {
      const admin = get().user;
      return admin?.permissions?.includes(required) ?? false;
    },
  }),
});
```

### createApiClient

Creates Axios instance with session-based authentication.

```typescript
interface CreateApiClientOptions {
  baseURL: string;
  onAuthExpired: () => void;
  loginPath?: string; // default: '/login'
  preserveReturnUrl?: boolean; // default: true
  requestInterceptor?: (config) => config;
  onResponseError?: (error) => void;
}

const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_AUTH_BFF_URL,
  onAuthExpired: () => useAuthStore.getState().clearAuth(),
});
```

Features:

- Session-based auth with cookies (`withCredentials: true`)
- Automatic 401 handling with auth state cleanup
- Redirect to login on session expiry
- Handles cancelled requests gracefully

## Dependencies

- `axios`: HTTP client
- `zustand`: State management
- `react`: Peer dependency

## Consumers

| App       | Usage                                 |
| --------- | ------------------------------------- |
| web-girok | User authentication                   |
| web-admin | Admin authentication with permissions |
