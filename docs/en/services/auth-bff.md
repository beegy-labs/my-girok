# Auth BFF (Backend for Frontend)

> Session-based authentication gateway implementing IETF BFF pattern with cookie-based auth

## Service Info

| Property | Value                  |
| -------- | ---------------------- |
| REST     | :4005                  |
| gRPC     | N/A (client only)      |
| Database | N/A (stateless)        |
| Cache    | Valkey DB 5 (sessions) |
| Codebase | `services/auth-bff/`   |

## Domain Boundaries

| This Service Owns   | NOT This Service (Other Services)     |
| ------------------- | ------------------------------------- |
| Session management  | Account storage (identity-service)    |
| Cookie-based auth   | JWT validation (identity-service)     |
| Token encryption    | Roles/Permissions (auth-service)      |
| OAuth orchestration | MFA implementation (identity-service) |
| Rate limiting       | Audit storage (audit-service)         |

## REST API

### User Authentication

| Method | Endpoint          | Description           |
| ------ | ----------------- | --------------------- |
| POST   | `/user/register`  | Register new user     |
| POST   | `/user/login`     | User login            |
| POST   | `/user/login-mfa` | Complete MFA login    |
| POST   | `/user/logout`    | User logout           |
| POST   | `/user/refresh`   | Refresh session       |
| GET    | `/user/me`        | Get current user info |

### Admin Authentication

| Method | Endpoint                     | Description             |
| ------ | ---------------------------- | ----------------------- |
| POST   | `/admin/login`               | Admin login             |
| POST   | `/admin/login-mfa`           | Complete MFA login      |
| POST   | `/admin/logout`              | Admin logout            |
| POST   | `/admin/refresh`             | Refresh session         |
| GET    | `/admin/me`                  | Get current admin info  |
| GET    | `/admin/sessions`            | List admin sessions     |
| DELETE | `/admin/sessions/:id`        | Revoke specific session |
| POST   | `/admin/sessions/revoke-all` | Revoke all sessions     |

### Admin MFA

| Method | Endpoint                             | Description             |
| ------ | ------------------------------------ | ----------------------- |
| GET    | `/admin/mfa/setup`                   | Get MFA setup QR code   |
| POST   | `/admin/mfa/verify`                  | Verify and enable MFA   |
| DELETE | `/admin/mfa`                         | Disable MFA             |
| POST   | `/admin/mfa/backup-codes/regenerate` | Regenerate backup codes |

### Admin Password

| Method | Endpoint                 | Description           |
| ------ | ------------------------ | --------------------- |
| POST   | `/admin/password/change` | Change admin password |

### Authorization Models

| Method | Endpoint                                   | Description      |
| ------ | ------------------------------------------ | ---------------- |
| POST   | `/admin/authorization/models`              | Create new model |
| POST   | `/admin/authorization/models/:id/activate` | Activate model   |
| GET    | `/admin/authorization/models`              | Get active model |
| GET    | `/admin/authorization/models/:id`          | Get model by ID  |

### OAuth

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| GET    | `/oauth/:provider`          | Initiate OAuth flow    |
| GET    | `/oauth/:provider/callback` | OAuth callback handler |

## gRPC Clients

| Service       | Port  | Purpose              |
| ------------- | ----- | -------------------- |
| identity      | 50051 | Account/Session/MFA  |
| auth          | 50052 | Admin auth/Operators |
| audit         | 50054 | Auth event logging   |
| authorization | 50055 | Authorization models |

## Session Storage

Sessions are stored in Valkey with encrypted tokens.

### Session Structure

```typescript
{
  id: string;
  accountId: string;
  accountType: 'user' | 'admin';
  email: string;
  accessToken: string;   // AES-256-GCM encrypted
  refreshToken: string;  // AES-256-GCM encrypted
  mfaVerified: boolean;
  mfaRequired: boolean;
  permissions: string[];
}
```

## Cache Keys (Valkey)

| Key Pattern        | TTL    | Description            |
| ------------------ | ------ | ---------------------- |
| `bff:session:{id}` | 7 days | Encrypted session data |

## Security Features

| Feature         | Implementation             |
| --------------- | -------------------------- |
| Cookies         | HttpOnly, Secure, SameSite |
| Token Storage   | AES-256-GCM in Valkey      |
| Rate Limiting   | Per-IP, Per-account        |
| Session Binding | Device fingerprint         |

## Environment Variables

```bash
# Server port
PORT=4005

# Session security (32+ characters)
SESSION_SECRET=your-session-secret-min-32-chars

# Token encryption (exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# Valkey connection
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=5

# gRPC service connections
IDENTITY_GRPC_HOST=identity-service
IDENTITY_GRPC_PORT=50051
AUTH_GRPC_HOST=auth-service
AUTH_GRPC_PORT=50052
AUDIT_GRPC_HOST=audit-service
AUDIT_GRPC_PORT=50054
AUTHORIZATION_GRPC_HOST=authorization-service
AUTHORIZATION_GRPC_PORT=50055

# OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Authorization Model API Details

### Create Model

```http
POST /admin/authorization/models
Content-Type: application/json
Cookie: sessionId=...

{
  "content": "type user\n\ntype resource\n  relations\n    define viewer: [user]",
  "activate": false
}
```

**Response (Success):**

```json
{
  "success": true,
  "modelId": "01HQXYZ123...",
  "versionId": "1"
}
```

**Response (Validation Error):**

```json
{
  "success": false,
  "errors": [
    {
      "type": "syntax",
      "message": "Unexpected token at line 3",
      "line": 3,
      "column": 12
    }
  ]
}
```

### Activate Model

```http
POST /admin/authorization/models/:id/activate
Cookie: sessionId=...
```

**Response:**

```json
{
  "success": true,
  "message": "Model activated successfully"
}
```

## Error Codes

| Code             | Status | Description                   |
| ---------------- | ------ | ----------------------------- |
| `EMPTY_CONTENT`  | 400    | Model content cannot be empty |
| `INVALID_DSL`    | 400    | DSL syntax or semantic errors |
| `UNAUTHORIZED`   | 401    | Not authenticated             |
| `FORBIDDEN`      | 403    | Insufficient permissions      |
| `NOT_FOUND`      | 404    | Resource not found            |
| `INTERNAL_ERROR` | 500    | Server error                  |

---

**LLM Reference**: `docs/llm/services/auth-bff.md`
