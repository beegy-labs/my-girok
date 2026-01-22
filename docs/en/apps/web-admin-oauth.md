# Web-Admin OAuth Settings

**Version**: 1.0.0 | **Updated**: 2026-01-17

**Location**: `apps/web-admin/src/pages/system/OAuthSettingsPage.tsx`

**Access**: MASTER role only

## Overview

The OAuth Settings page allows administrators to configure OAuth provider credentials and control authentication providers for end users.

## Architecture

### Component Hierarchy

```
OAuthSettingsPage
├── PageHeader (title, subtitle, refresh button)
├── SecurityNotice (encryption information)
├── LoadingState (spinner)
├── ErrorState (error message + retry)
└── ProviderGrid
    └── OAuthProviderCard[] (for each provider)
        ├── Display Mode: ClientIdDisplay, ClientSecretMasked, CallbackUrlDisplay, Actions
        └── Edit Mode: ClientIdInput, ClientSecretInput, CallbackUrlInput, Actions
```

### Data Flow

User -> Component -> API -> Backend -> Database -> State Update -> UI -> Toast

## API Integration

**File**: `apps/web-admin/src/api/oauth.ts`

### Types

```typescript
interface OAuthProviderConfig {
  provider: AuthProvider;
  enabled: boolean;
  clientId?: string;
  clientSecretMasked?: string; // Last 4 chars only
  callbackUrl?: string;
  displayName: string;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}
```

### Endpoints

| Method | Endpoint                            | Auth   | Purpose                 |
| ------ | ----------------------------------- | ------ | ----------------------- |
| GET    | `/v1/oauth-config`                  | MASTER | Fetch all providers     |
| GET    | `/v1/oauth-config/:provider`        | MASTER | Fetch specific provider |
| PATCH  | `/v1/oauth-config/:provider/toggle` | MASTER | Enable/disable provider |
| PATCH  | `/v1/oauth-config/:provider`        | MASTER | Update credentials      |
| GET    | `/v1/oauth-config/:provider/status` | Public | Check if enabled        |

## Components

### OAuthProviderCard

**State Management**:

- `isEditing`: Toggle between display and edit modes
- `showSecret`: Toggle secret visibility in edit mode
- `loading`: Loading state during API calls
- `clientId`, `clientSecret`, `callbackUrl`: Form field values

**Modes**:

- **Display Mode**: Read-only view with masked secrets
- **Edit Mode**: Form inputs with show/hide toggle for secrets

**Provider Metadata**:

| Provider | Display Name | Color Style      | Icon  |
| -------- | ------------ | ---------------- | ----- |
| GOOGLE   | Google       | bg-blue-100...   | Blue  |
| KAKAO    | Kakao        | bg-yellow-100... | Chat  |
| NAVER    | Naver        | bg-green-100...  | Green |
| APPLE    | Apple        | bg-gray-100...   | Apple |

## Navigation

**Route**: `/system/oauth`

**Menu Hierarchy**: System -> OAuth Settings

**Required Permission**: `settings:read`

## Provider Setup

### Callback URL Format

| Provider | Callback URL                                          |
| -------- | ----------------------------------------------------- |
| Google   | `https://auth-bff.girok.dev/v1/oauth/google/callback` |
| Kakao    | `https://auth-bff.girok.dev/v1/oauth/kakao/callback`  |
| Naver    | `https://auth-bff.girok.dev/v1/oauth/naver/callback`  |
| Apple    | `https://auth-bff.girok.dev/v1/oauth/apple/callback`  |

### Setup Guides

| Provider | Console URL                         | Notes                       |
| -------- | ----------------------------------- | --------------------------- |
| Google   | Google Cloud Console -> Credentials | OAuth 2.0 Client ID         |
| Kakao    | Kakao Developers -> My Application  | REST API Key + Secret       |
| Naver    | Naver Developers -> Application     | Client ID + Secret          |
| Apple    | Apple Developer -> Identifiers      | JWT-based secret generation |

## Related Documentation

- **Security & Testing**: [web-admin-oauth-security.md](web-admin-oauth-security.md)
- **Backend**: `services/auth-service/src/oauth-config/`

---

_This document is auto-generated from `docs/llm/apps/web-admin-oauth.md`_
