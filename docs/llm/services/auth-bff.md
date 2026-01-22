# auth-bff

```yaml
port: 4005
grpc: N/A (client only)
db: N/A (stateless)
cache: Valkey DB 5 (sessions)
events: N/A
codebase: services/auth-bff/
```

## Boundaries

| Owns                | Not                |
| ------------------- | ------------------ |
| Session management  | Account storage    |
| Cookie-based auth   | JWT validation     |
| Token encryption    | Roles/Permissions  |
| OAuth orchestration | MFA implementation |
| Rate limiting       | Audit storage      |

## REST

```
# User
POST /user/register|login|login-mfa|logout|refresh
GET /user/me

# Admin
POST /admin/login|login-mfa|logout|refresh
GET /admin/me|sessions
DELETE /admin/sessions/:id
POST /admin/sessions/revoke-all

# Admin MFA
GET /admin/mfa/setup
POST /admin/mfa/verify
DELETE /admin/mfa
POST /admin/mfa/backup-codes/regenerate

# Admin Password
POST /admin/password/change

# Admin Authorization Models
POST /admin/authorization/models
POST /admin/authorization/models/:id/activate
GET /admin/authorization/models
GET /admin/authorization/models/:id

# OAuth
GET /oauth/:provider[/callback]
```

## gRPC Clients

| Service       | Port  | Purpose              |
| ------------- | ----- | -------------------- |
| identity      | 50051 | Account/Session/MFA  |
| auth          | 50052 | Admin auth/Operators |
| audit         | 50054 | Auth event logging   |
| authorization | 50055 | Authorization models |

## Session (Valkey)

| Key                | TTL    | Content           |
| ------------------ | ------ | ----------------- |
| `bff:session:{id}` | 7 days | Encrypted session |

```typescript
{ id, accountId, accountType, email,
  accessToken, refreshToken, // AES-256 encrypted
  mfaVerified, mfaRequired, permissions[] }
```

## Security

| Feature         | Implementation             |
| --------------- | -------------------------- |
| Cookies         | HttpOnly, Secure, SameSite |
| Token Storage   | AES-256-GCM in Valkey      |
| Rate Limiting   | Per-IP, Per-account        |
| Session Binding | Device fingerprint         |

## Env

```bash
PORT=4005
SESSION_SECRET=...  # 32+ chars
ENCRYPTION_KEY=...  # 32 chars
VALKEY_HOST|PORT|DB
IDENTITY_GRPC_HOST|PORT
AUTH_GRPC_HOST|PORT
AUDIT_GRPC_HOST|PORT
AUTHORIZATION_GRPC_HOST|PORT
GOOGLE_CLIENT_ID|SECRET
```

## Related Documentation

- **API Details**: `auth-bff-api.md`
- [Authorization Service](./authorization-service.md) - Backend service (gRPC)
- [Monaco Auth DSL Editor](../components/monaco-auth-dsl-editor.md) - Frontend component
