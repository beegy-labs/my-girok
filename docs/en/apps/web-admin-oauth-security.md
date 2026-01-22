# Web-Admin OAuth Settings - Security & Testing

This document covers security, error handling, testing, and performance considerations for the OAuth Settings feature.

## Security

### Secret Handling

**Encryption**:

- Algorithm: AES-256-GCM
- Key Storage: Environment variable

**Masking**:

- Format: `********{last4chars}`
- Example: `********fg78`

**Visibility Rules**:

- Edit mode: Show/hide toggle for new secrets
- Existing secrets: Cannot retrieve, only update

**Validation**:

- Callback URL: Must be HTTPS for production
- Domain whitelist: Enforced by backend

### Access Control

**RBAC Configuration**:

- Required Role: MASTER
- Required Permission: `settings:read`
- Enforcement: PrivateRoute + backend RBAC

**Audit Trail**:

- All configuration changes are tracked
- Recorded fields: admin ID, timestamp, changes

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

**Unit Tests**:

- `apps/web-admin/src/api/oauth.ts`
- `apps/web-admin/src/hooks/useToast.ts`

**Component Tests**:

- `OAuthSettingsPage.tsx`: Load, error, toggle, refresh
- `OAuthProviderCard.tsx`: Display, edit, secret toggle, submit

**E2E Tests**:

1. Navigate to `/system/oauth`
2. Verify 4 providers displayed
3. Toggle provider status
4. Update credentials
5. Error handling + retry

**Target Coverage**: 80%+

## Performance

### Optimization Strategies

**Data Fetching**:

- Load once on mount
- Refresh on user action only
- No polling/real-time updates

**Components**:

- `memo` for OAuthProviderCard
- `useCallback` for handlers

**Bundle**:

- Lazy load page
- Tree-shake icons

### Metrics

- Minimal re-renders
- No unnecessary network requests

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

---

**Main Document**: [web-admin-oauth.md](web-admin-oauth.md)

---

_This document is auto-generated from `docs/llm/apps/web-admin-oauth-security.md`_
