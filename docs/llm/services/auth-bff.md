# auth-bff

```yaml
port: 4005
grpc: N/A (client only)
db: N/A (stateless)
cache: Valkey DB 3 (sessions)
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

## API Endpoints

### Authorization Models

#### Create Model

```http
POST /admin/authorization/models
Content-Type: application/json
Cookie: sessionId=...
```

**Request Body:**

```json
{
  "content": "type user\n\ntype resource\n  relations\n    define viewer: [user]",
  "activate": false
}
```

| Field      | Type      | Required | Description                                                |
| ---------- | --------- | -------- | ---------------------------------------------------------- |
| `content`  | `string`  | Yes      | Authorization DSL source code                              |
| `activate` | `boolean` | No       | Activate model immediately after creation (default: false) |

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
    },
    {
      "type": "validation",
      "relation": "viewer",
      "message": "Undefined type reference: admin"
    }
  ]
}
```

**Error Codes:**

| Code             | Status | Description                   |
| ---------------- | ------ | ----------------------------- |
| `EMPTY_CONTENT`  | 400    | Model content cannot be empty |
| `INVALID_DSL`    | 400    | DSL syntax or semantic errors |
| `UNAUTHORIZED`   | 401    | Not authenticated             |
| `FORBIDDEN`      | 403    | Insufficient permissions      |
| `INTERNAL_ERROR` | 500    | Server error                  |

#### Activate Model

```http
POST /admin/authorization/models/:id/activate
Cookie: sessionId=...
```

**Path Parameters:**

| Parameter | Type     | Description            |
| --------- | -------- | ---------------------- |
| `id`      | `string` | Model ID (ULID format) |

**Response (Success):**

```json
{
  "success": true,
  "message": "Model activated successfully"
}
```

**Response (Error):**

```json
{
  "success": false,
  "message": "Model not found"
}
```

**Error Codes:**

| Code             | Status | Description                   |
| ---------------- | ------ | ----------------------------- |
| `NOT_FOUND`      | 404    | Model with given ID not found |
| `UNAUTHORIZED`   | 401    | Not authenticated             |
| `FORBIDDEN`      | 403    | Insufficient permissions      |
| `INTERNAL_ERROR` | 500    | Server error                  |

#### Get Active Model

```http
GET /admin/authorization/models
Cookie: sessionId=...
```

**Response:**

```json
{
  "id": "01HQXYZ123...",
  "version": 5,
  "content": "",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "createdBy": "system"
}
```

#### Get Model by ID

```http
GET /admin/authorization/models/:id
Cookie: sessionId=...
```

**Response:**

```json
{
  "id": "01HQXYZ123...",
  "version": 5,
  "content": "type user\n\ntype resource\n  relations\n    define viewer: [user]",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "createdBy": "admin@example.com"
}
```

## Service Implementation

### AuthorizationService

**Location:** `services/auth-bff/src/admin/authorization/authorization.service.ts`

Key methods:

```typescript
class AuthorizationService {
  /**
   * Create a new authorization model
   *
   * NOTE: This delegates to authorization-service (port 50055) via gRPC.
   * Full DSL validation is performed by the backend service.
   */
  async createModel(
    dslSource: string,
    activate?: boolean,
  ): Promise<{
    success: boolean;
    modelId?: string;
    versionId?: string;
    errors?: Array<{
      type: string;
      relation?: string;
      message: string;
      line?: number;
      column?: number;
    }>;
  }>;

  /**
   * Activate an existing model
   *
   * Switches the active authorization model to the specified version.
   */
  async activateModel(id: string): Promise<{
    success: boolean;
    message?: string;
  }>;

  /**
   * Validate model (BFF-level basic validation only)
   *
   * NOTE: This performs only basic empty check.
   * Full DSL syntax parsing is handled by authorization-service.
   */
  async validateModel(dslSource: string): Promise<{
    valid: boolean;
    errors: string[];
  }>;
}
```

## Related Documentation

- [Authorization Service](./authorization-service.md) - Backend service (gRPC)
- [Monaco Auth DSL Editor](../components/monaco-auth-dsl-editor.md) - Frontend component
- [Design Tokens](../packages/design-tokens.md) - Theme integration
