# Web-Admin OAuth Settings Management

> **SSOT for OAuth Settings UI in web-admin**
> **Version**: 1.0.0
> **Last Updated**: 2026-01-17

## Overview

OAuth Settings management page allows MASTER administrators to configure OAuth provider credentials and control which authentication providers are available to end users.

## Architecture

### Component Hierarchy

```
OAuthSettingsPage
├── PageHeader (title, subtitle, refresh button)
├── SecurityNotice (encryption information)
├── LoadingState (Spinner)
├── ErrorState (error message + retry button)
└── ProviderGrid
    └── OAuthProviderCard[] (one for each provider)
        ├── ProviderHeader (icon, name, status badge)
        ├── DisplayMode (read-only view)
        │   ├── ClientIdDisplay
        │   ├── ClientSecretMasked
        │   ├── CallbackUrlDisplay
        │   └── Actions (Edit, Enable/Disable)
        └── EditMode (credential update form)
            ├── ClientIdInput
            ├── ClientSecretInput (with show/hide toggle)
            ├── CallbackUrlInput
            └── Actions (Save, Cancel)
```

### Data Flow

```
User Action → Component → API Call → Backend → Database
                ↓
           State Update → UI Re-render → Toast Notification
```

## API Integration

### API Client

**File**: `apps/web-admin/src/api/oauth.ts`

```typescript
interface OAuthProviderConfig {
  provider: AuthProvider;
  enabled: boolean;
  clientId?: string;
  clientSecretMasked?: string; // Last 4 characters only
  callbackUrl?: string;
  displayName: string;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

interface UpdateCredentialsRequest {
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
}

interface ToggleProviderRequest {
  enabled: boolean;
}
```

#### Methods

1. **getAllProviders()**
   - Endpoint: `GET /v1/oauth-config`
   - Auth: MASTER role required
   - Returns: `OAuthProviderConfig[]`
   - Purpose: Fetch all OAuth provider configurations with masked secrets

2. **getProvider(provider)**
   - Endpoint: `GET /v1/oauth-config/:provider`
   - Auth: MASTER role required
   - Returns: `OAuthProviderConfig`
   - Purpose: Fetch specific provider configuration

3. **toggleProvider(provider, enabled)**
   - Endpoint: `PATCH /v1/oauth-config/:provider/toggle`
   - Auth: MASTER role required
   - Body: `{ enabled: boolean }`
   - Returns: `OAuthProviderConfig`
   - Purpose: Enable or disable OAuth provider

4. **updateCredentials(provider, credentials)**
   - Endpoint: `PATCH /v1/oauth-config/:provider`
   - Auth: MASTER role required
   - Body: `UpdateCredentialsRequest`
   - Returns: `OAuthProviderConfig`
   - Purpose: Update OAuth credentials (clientId, clientSecret, callbackUrl)

5. **getProviderStatus(provider)**
   - Endpoint: `GET /v1/oauth-config/:provider/status`
   - Auth: Public (no auth required)
   - Returns: `{ provider: string, enabled: boolean }`
   - Purpose: Check if provider is enabled

## Components

### OAuthSettingsPage

**File**: `apps/web-admin/src/pages/system/OAuthSettingsPage.tsx`

**Responsibilities**:

- Load all OAuth provider configurations on mount
- Manage global loading/error states
- Coordinate provider toggle and credential update operations
- Display toast notifications for success/error feedback

**State Management**:

```typescript
const [providers, setProviders] = useState<OAuthProviderConfig[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**Key Handlers**:

- `loadProviders()` - Fetch all providers from API
- `handleToggle(provider, enabled)` - Enable/disable provider
- `handleUpdate(provider, credentials)` - Update provider credentials

**UI Sections**:

1. **Page Header**: Title, subtitle, refresh button
2. **Security Notice**: Warning about AES-256-GCM encryption
3. **Loading State**: Spinner while fetching data
4. **Error State**: Error message with retry button
5. **Provider Grid**: 2-column grid of OAuthProviderCard components
6. **Help Section**: Setup guides for each OAuth provider

### OAuthProviderCard

**File**: `apps/web-admin/src/pages/system/components/OAuthProviderCard.tsx`

**Props**:

```typescript
interface OAuthProviderCardProps {
  provider: OAuthProviderConfig;
  onToggle: (provider: AuthProvider, enabled: boolean) => Promise<void>;
  onUpdate: (provider: AuthProvider, credentials: UpdateCredentialsRequest) => Promise<void>;
}
```

**Responsibilities**:

- Display provider information and current configuration
- Toggle between display mode and edit mode
- Validate and submit credential updates
- Show/hide client secret in edit mode

**State Management**:

```typescript
const [isEditing, setIsEditing] = useState(false);
const [showSecret, setShowSecret] = useState(false);
const [loading, setLoading] = useState(false);
const [toggleLoading, setToggleLoading] = useState(false);
const [clientId, setClientId] = useState('');
const [clientSecret, setClientSecret] = useState('');
const [callbackUrl, setCallbackUrl] = useState('');
```

**Modes**:

1. **Display Mode** (default):
   - Shows current configuration (read-only)
   - Displays masked client secret
   - Actions: "Edit Credentials", "Enable/Disable"

2. **Edit Mode**:
   - Form inputs for clientId, clientSecret, callbackUrl
   - Show/hide toggle for client secret
   - Actions: "Save Changes", "Cancel"

**Provider Metadata**:

```typescript
const PROVIDER_METADATA: Record<string, {
  name: string;
  color: string;
  icon: string;
  description: string;
}> = {
  GOOGLE: { name: 'Google', color: 'bg-blue-100...', icon: '🔵', ... },
  KAKAO: { name: 'Kakao', color: 'bg-yellow-100...', icon: '💬', ... },
  NAVER: { name: 'Naver', color: 'bg-green-100...', icon: '🟢', ... },
  APPLE: { name: 'Apple', color: 'bg-gray-100...', icon: '', ... },
};
```

## Navigation Integration

### Route Configuration

**File**: `apps/web-admin/src/router.tsx`

```typescript
{
  path: 'system/oauth',
  element: (
    <PrivateRoute permission="settings:read">
      <OAuthSettingsPage />
    </PrivateRoute>
  ),
}
```

**Access Control**:

- Permission: `settings:read`
- Role: MASTER (enforced by backend RBAC)

### Menu Configuration

**File**: `apps/web-admin/src/config/menu.config.ts`

```typescript
{
  id: 'system-oauth',
  path: '/system/oauth',
  icon: Key,
  labelKey: 'menu.oauthSettings',
  permission: 'settings:read',
  order: 2,
}
```

**Menu Hierarchy**:

```
System
├── Supported Countries
├── Supported Locales
├── OAuth Settings ← NEW
├── Audit Logs
├── Login History
├── Session Recordings
└── Settings
```

## Internationalization

**File**: `apps/web-admin/src/i18n/locales/en.json`

**Added Keys**:

```json
{
  "menu": {
    "oauthSettings": "OAuth Settings",
    "users": "Users",
    "usersOverview": "Users Overview",
    "authorization": "Authorization"
  }
}
```

## Toast Notifications

**Hook**: `apps/web-admin/src/hooks/useToast.ts`

**Usage**:

```typescript
const { showToast } = useToast();

showToast({
  type: 'success' | 'error' | 'info' | 'warning',
  title: string,
  message: string,
  duration?: number, // default: 4000ms
});
```

**Integration**: Uses Sonner library via ToastProvider

**Toast Messages**:

- **Success**: "Provider updated", "Credentials updated successfully"
- **Error**: "Failed to load OAuth providers", "Failed to toggle provider", "Failed to update credentials"

## Security Considerations

### Secret Handling

1. **Encryption**:
   - All client secrets are encrypted using AES-256-GCM on the backend
   - Encryption key stored in environment variable

2. **Masking**:
   - Secrets are masked in the UI (only last 4 characters shown)
   - Example: `********fg78`

3. **Secret Visibility**:
   - Edit mode provides show/hide toggle for new secrets
   - Existing secrets cannot be retrieved (only updated)

4. **Validation**:
   - Callback URL validation (must be HTTPS for production)
   - Domain whitelist check on backend

### Access Control

1. **Role-Based**:
   - Only MASTER admins can access OAuth settings
   - Enforced by `PrivateRoute` with `settings:read` permission

2. **Audit Logging**:
   - All configuration changes are logged
   - Includes: admin ID, timestamp, changes made

## OAuth Provider Setup Guides

### Google OAuth 2.0

1. Visit Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs
4. Copy Client ID and Client Secret

**Callback URL Format**: `https://auth-bff.girok.dev/v1/oauth/google/callback`

### Kakao Login

1. Visit Kakao Developers → My Application
2. Navigate to Kakao Login settings
3. Set Redirect URI
4. Copy REST API Key (Client ID) and Client Secret

**Callback URL Format**: `https://auth-bff.girok.dev/v1/oauth/kakao/callback`

### Naver Login

1. Visit Naver Developers → Application → Register
2. Set Callback URL
3. Copy Client ID and Client Secret

**Callback URL Format**: `https://auth-bff.girok.dev/v1/oauth/naver/callback`

### Sign in with Apple

1. Visit Apple Developer → Certificates, Identifiers & Profiles
2. Create Services ID and configure Sign In with Apple
3. Set Return URLs
4. Generate Client Secret using private key (JWT-based)

**Callback URL Format**: `https://auth-bff.girok.dev/v1/oauth/apple/callback`

**Special Note**: Apple uses JWT-based client secret generation with private key

## Error Handling

### API Errors

**Common Error Scenarios**:

1. **Unauthorized** (401): Redirect to login
2. **Forbidden** (403): Show permission error
3. **Not Found** (404): Provider configuration not found
4. **Bad Request** (400): Invalid callback URL or credentials
5. **Server Error** (500): Backend service unavailable

**Error Display**:

- Global errors: Full-page error state with retry button
- Provider-specific errors: Toast notification
- Form validation errors: Inline error messages

### Graceful Degradation

1. **API Failure**: Show error state with retry button
2. **Partial Load**: Display loaded providers, show error toast
3. **Update Failure**: Revert UI state, show error toast

## Testing Strategy

### Unit Tests

**Files to Test**:

1. `apps/web-admin/src/api/oauth.ts`
   - Mock API calls
   - Test response parsing
   - Test error handling

2. `apps/web-admin/src/hooks/useToast.ts`
   - Test toast function calls
   - Test toast options

### Component Tests

**Files to Test**:

1. `apps/web-admin/src/pages/system/OAuthSettingsPage.tsx`
   - Render with providers
   - Loading state
   - Error state
   - Provider toggle
   - Refresh button

2. `apps/web-admin/src/pages/system/components/OAuthProviderCard.tsx`
   - Display mode rendering
   - Edit mode rendering
   - Show/hide secret toggle
   - Form submission
   - Cancel action

**Test Coverage Target**: 80%+

### E2E Tests

**Test Scenarios**:

1. **Load OAuth Settings Page**
   - Navigate to /system/oauth
   - Verify all 4 providers are displayed
   - Verify status badges are correct

2. **Toggle Provider**
   - Click enable/disable toggle
   - Verify API call is made
   - Verify status badge updates
   - Verify toast notification appears

3. **Update Credentials**
   - Click "Edit Credentials"
   - Enter new credentials
   - Click "Save Changes"
   - Verify API call is made
   - Verify masked secret updates
   - Verify toast notification appears

4. **Error Handling**
   - Simulate API failure
   - Verify error state is shown
   - Click retry button
   - Verify data reloads

## Performance Considerations

### Optimization Strategies

1. **Data Fetching**:
   - Load providers once on mount
   - Refresh only on user action (refresh button)
   - No polling or real-time updates

2. **Component Optimization**:
   - Use `memo` for OAuthProviderCard
   - Use `useCallback` for event handlers
   - Minimize re-renders

3. **Bundle Size**:
   - Lazy load OAuthSettingsPage
   - Tree-shake unused Lucide icons
   - Optimize toast library imports

## Future Enhancements

1. **Batch Operations**:
   - Enable/disable multiple providers at once
   - Bulk credential updates

2. **Credential Validation**:
   - Test OAuth flow before saving
   - Verify callback URL accessibility

3. **Audit Log Integration**:
   - Display recent changes inline
   - Link to full audit log

4. **Provider Statistics**:
   - Show OAuth login count per provider
   - Display last successful login

5. **Advanced Configuration**:
   - Custom scope configuration
   - Token expiry settings
   - Rate limiting per provider

## References

- Backend Implementation: `services/auth-service/src/oauth-config/`
- BFF Integration: `services/auth-bff/src/oauth/`
- Types: `packages/types/src/auth/enums.ts` (AuthProvider, OAuthProvider)
- Related Documentation: `.ai/services/auth-service.md`

## Changelog

### v1.0.0 (2026-01-17)

- Initial OAuth Settings management UI
- Support for Google, Kakao, Naver, Apple
- Enable/disable toggle
- Credential update with secret masking
- Security notice and setup guides
