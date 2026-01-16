# @my-girok/auth-utils

> Shared authentication utilities for frontend applications using session-based BFF pattern

## Overview

The auth-utils package provides reusable authentication utilities for React applications that use the Backend-for-Frontend (BFF) pattern with session-based authentication. It includes state management with Zustand and HTTP client configuration with Axios.

## Installation

This package is available as an internal workspace dependency:

```typescript
import { createAuthStore, createApiClient } from '@my-girok/auth-utils';
```

## Authentication Store

### Basic Usage

The `createAuthStore` function creates a Zustand store pre-configured for authentication state management:

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
```

### Extended Usage

For applications requiring additional state or methods (such as permission checking), use `createExtendedAuthStore`:

```typescript
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

## API Client

### Configuration

The `createApiClient` function creates an Axios instance configured for session-based authentication:

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

### Features

The API client provides several authentication-related features out of the box:

1. **Session-based authentication**: Automatically includes credentials with every request (`withCredentials: true`), ensuring session cookies are sent to the BFF.

2. **Automatic 401 handling**: When a request returns a 401 Unauthorized response, the client automatically clears the authentication state and redirects to the login page.

3. **Login redirect with return URL**: When redirecting to login, the current URL is preserved so users can be returned to their original destination after authentication.

4. **Cancelled request handling**: Properly handles aborted requests without triggering error callbacks, preventing unnecessary error handling for intentionally cancelled operations.

## Dependencies

This package requires the following dependencies:

| Dependency | Purpose                                   |
| ---------- | ----------------------------------------- |
| axios      | HTTP client for API requests              |
| zustand    | State management for authentication state |
| react      | Peer dependency for React applications    |

## Consumer Applications

| Application | Usage                                            |
| ----------- | ------------------------------------------------ |
| web-girok   | User authentication for the main web application |
| web-admin   | Admin authentication with permission management  |

---

**LLM Reference**: `docs/llm/packages/auth-utils.md`
