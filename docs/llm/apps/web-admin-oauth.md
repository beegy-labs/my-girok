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
          display_mode:
            - ClientIdDisplay
            - ClientSecretMasked
            - CallbackUrlDisplay
            - Actions: Edit, Enable/Disable
          edit_mode:
            - ClientIdInput
            - ClientSecretInput (show/hide toggle)
            - CallbackUrlInput
            - Actions: Save, Cancel

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
state:
  - isEditing: boolean
  - showSecret: boolean
  - loading: boolean
  - clientId, clientSecret, callbackUrl: string

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

**Menu Hierarchy**:

```
System
├── OAuth Settings ← settings:read permission
├── Audit Logs
└── Settings
```

**i18n Key**: `menu.oauthSettings`

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

## Security

### Secret Handling

```yaml
encryption:
  algorithm: AES-256-GCM
  key_storage: Environment variable

masking:
  format: '********{last4chars}'
  example: '********fg78'

visibility:
  - Edit mode: show/hide toggle for new secrets
  - Existing secrets: Cannot retrieve, only update

validation:
  - Callback URL: HTTPS for production
  - Domain whitelist: Backend check
```

### Access Control

```yaml
rbac:
  role: MASTER
  permission: settings:read
  enforcement: PrivateRoute + backend RBAC

audit:
  tracked: All configuration changes
  fields: admin ID, timestamp, changes
```

## Error Handling

| Code | Scenario                     | Display                    |
| ---- | ---------------------------- | -------------------------- |
| 401  | Unauthorized                 | Redirect to login          |
| 403  | Forbidden                    | Permission error           |
| 404  | Provider not found           | Toast notification         |
| 400  | Invalid credentials/callback | Inline error message       |
| 500  | Server error                 | Full-page error with retry |

## Testing

### Test Coverage

```yaml
unit_tests:
  - apps/web-admin/src/api/oauth.ts
  - apps/web-admin/src/hooks/useToast.ts

component_tests:
  - OAuthSettingsPage.tsx: Load, error, toggle, refresh
  - OAuthProviderCard.tsx: Display, edit, secret toggle, submit

e2e_tests:
  - Navigate to /system/oauth
  - Verify 4 providers displayed
  - Toggle provider status
  - Update credentials
  - Error handling + retry

target_coverage: 80%+
```

## Performance

```yaml
optimization:
  data_fetching: Load once on mount, refresh on user action only
  components: memo for OAuthProviderCard, useCallback for handlers
  bundle: Lazy load page, tree-shake icons

metrics:
  - No polling/real-time updates
  - Minimal re-renders
```

## Future Enhancements

- Batch enable/disable multiple providers
- Test OAuth flow before saving
- Verify callback URL accessibility
- Display OAuth login statistics per provider
- Custom scope configuration
- Token expiry settings

## References

- Backend: `services/auth-service/src/oauth-config/`
- BFF: `services/auth-bff/src/oauth/`
- Types: `packages/types/src/auth/enums.ts`
- Related: `.ai/services/auth-service.md`
