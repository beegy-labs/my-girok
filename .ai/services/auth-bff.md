# Auth BFF Service

> Session-based authentication gateway (IETF BFF pattern) | **Last Updated**: 2026-01-08

## Service Info

| Property | Value                  |
| -------- | ---------------------- |
| REST     | :4005                  |
| gRPC     | N/A (client only)      |
| Database | N/A (stateless)        |
| Cache    | Valkey DB 3 (sessions) |
| Events   | N/A                    |
| Codebase | `services/auth-bff/`   |

## Domain Boundaries

| This Service             | NOT This Service              |
| ------------------------ | ----------------------------- |
| Session management       | Account storage (identity)    |
| Cookie-based auth        | JWT validation (identity)     |
| Token encryption         | Roles, Permissions (auth)     |
| OAuth flow orchestration | MFA implementation (identity) |
| Rate limiting            | Audit storage (audit)         |

## REST API

```
# User Authentication
POST   /user/register              # Create account + session
POST   /user/login                 # Login (may return MFA challenge)
POST   /user/login-mfa             # Complete MFA verification
POST   /user/logout                # Destroy session
GET    /user/me                    # Get current user info
POST   /user/refresh               # Refresh session

# Admin Authentication
POST   /admin/login                # Admin login (MFA required)
POST   /admin/login-mfa            # Admin MFA verification
POST   /admin/logout               # Admin logout
GET    /admin/me                   # Get current admin info
POST   /admin/refresh              # Refresh admin session
GET    /admin/sessions             # List active sessions
DELETE /admin/sessions/:id         # Revoke specific session
POST   /admin/sessions/revoke-all  # Revoke all other sessions

# Admin MFA Management
GET    /admin/mfa/setup            # Start MFA setup
POST   /admin/mfa/verify           # Verify MFA setup
DELETE /admin/mfa                  # Disable MFA
POST   /admin/mfa/backup-codes/regenerate

# Admin Password
POST   /admin/password/change      # Change password

# OAuth (User)
GET    /oauth/:provider            # Start OAuth flow
GET    /oauth/:provider/callback   # OAuth callback
```

## gRPC Clients

| Service          | Port  | Purpose               |
| ---------------- | ----- | --------------------- |
| identity-service | 50051 | Account, Session, MFA |
| auth-service     | 50052 | Admin auth, Operators |
| audit-service    | 50054 | Auth event logging    |

## Session Storage (Valkey)

| Key Pattern        | TTL    | Content                |
| ------------------ | ------ | ---------------------- |
| `bff:session:{id}` | 7 days | Encrypted session data |

**Session Data:**

```typescript
{
  id, accountId, accountType,
  email, accessToken (encrypted),
  refreshToken (encrypted),
  mfaVerified, mfaRequired,
  permissions[], metadata
}
```

## Security Features

| Feature         | Implementation                    |
| --------------- | --------------------------------- |
| Cookie Security | HttpOnly, Secure, SameSite=Strict |
| Token Storage   | AES-256-GCM encrypted in Valkey   |
| Rate Limiting   | Per-IP and per-account            |
| CSRF Protection | SameSite cookies                  |
| Session Binding | Device fingerprint validation     |

## Environment

```bash
PORT=4005
SESSION_SECRET=...              # Min 32 chars
ENCRYPTION_KEY=...              # Exactly 32 chars for AES-256
SESSION_COOKIE_NAME=__Host-session
SESSION_MAX_AGE=604800000       # 7 days
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=3

# gRPC Clients
IDENTITY_GRPC_HOST=localhost
IDENTITY_GRPC_PORT=50051
AUTH_GRPC_HOST=localhost
AUTH_GRPC_PORT=50052
AUDIT_GRPC_HOST=localhost
AUDIT_GRPC_PORT=50054

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

**SSOT**: `docs/llm/services/auth-bff.md` | **Full docs**: `docs/en/services/auth-bff.md`
