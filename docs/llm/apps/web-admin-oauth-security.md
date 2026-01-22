# Web-Admin OAuth Settings - Security & Testing

> Security, error handling, testing, and performance

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

---

_Main: `web-admin-oauth.md`_
