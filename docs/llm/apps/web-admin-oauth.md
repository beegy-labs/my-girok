# Web-Admin OAuth Settings

```yaml
version: 1.0.0
updated: 2026-01-17
location: apps/web-admin/src/pages/system/OAuthSettingsPage.tsx
access: MASTER role only
```

## Overview

Configure OAuth provider credentials and control authentication providers for end users.

## Architecture

```yaml
component_hierarchy:
  OAuthSettingsPage:
    - PageHeader: title, subtitle, refresh button
    - SecurityNotice: encryption information
    - LoadingState: spinner
    - ErrorState: error message + retry
    - ProviderGrid:
        - OAuthProviderCard[]:
          display_mode: ClientIdDisplay, ClientSecretMasked, CallbackUrlDisplay, Actions
          edit_mode: ClientIdInput, ClientSecretInput, CallbackUrlInput, Actions

data_flow: User → Component → API → Backend → Database → State Update → UI → Toast
```

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

```yaml
state: [isEditing, showSecret, loading, clientId, clientSecret, callbackUrl]

modes:
  display: Read-only view with masked secrets
  edit: Form inputs with show/hide toggle

metadata:
  GOOGLE: { name: 'Google', color: 'bg-blue-100...', icon: '🔵' }
  KAKAO: { name: 'Kakao', color: 'bg-yellow-100...', icon: '💬' }
  NAVER: { name: 'Naver', color: 'bg-green-100...', icon: '🟢' }
  APPLE: { name: 'Apple', color: 'bg-gray-100...', icon: '' }
```

## Navigation

**Route**: `/system/oauth`

**Menu Hierarchy**: System → OAuth Settings (settings:read permission)

## Provider Setup

### Callback URL Format

```yaml
google: https://auth-bff.girok.dev/v1/oauth/google/callback
kakao: https://auth-bff.girok.dev/v1/oauth/kakao/callback
naver: https://auth-bff.girok.dev/v1/oauth/naver/callback
apple: https://auth-bff.girok.dev/v1/oauth/apple/callback
```

### Setup Guides

| Provider | Console URL                        | Notes                       |
| -------- | ---------------------------------- | --------------------------- |
| Google   | Google Cloud Console → Credentials | OAuth 2.0 Client ID         |
| Kakao    | Kakao Developers → My Application  | REST API Key + Secret       |
| Naver    | Naver Developers → Application     | Client ID + Secret          |
| Apple    | Apple Developer → Identifiers      | JWT-based secret generation |

## Related Documentation

- **Security & Testing**: `web-admin-oauth-security.md`
- Backend: `services/auth-service/src/oauth-config/`
