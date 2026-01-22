# Auth BFF - API Reference

> Authorization model management API and service implementation for the Auth BFF layer.

## Overview

The Auth BFF provides REST endpoints for managing authorization models, acting as a proxy to the authorization-service via gRPC. This document covers the API endpoints for creating, activating, and retrieving authorization models.

## Authorization Models API

### Create Model

Creates a new authorization model with DSL (Domain Specific Language) content.

**Endpoint:**

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

**Parameters:**

| Field      | Type      | Required | Description                                                |
| ---------- | --------- | -------- | ---------------------------------------------------------- |
| `content`  | `string`  | Yes      | Authorization DSL source code                              |
| `activate` | `boolean` | No       | Activate model immediately after creation (default: false) |

**Success Response:**

```json
{
  "success": true,
  "modelId": "01HQXYZ123...",
  "versionId": "1"
}
```

**Validation Error Response:**

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

---

### Activate Model

Activates an existing authorization model, making it the current active model for permission checks.

**Endpoint:**

```http
POST /admin/authorization/models/:id/activate
Cookie: sessionId=...
```

**Path Parameters:**

| Parameter | Type     | Description            |
| --------- | -------- | ---------------------- |
| `id`      | `string` | Model ID (ULID format) |

**Success Response:**

```json
{
  "success": true,
  "message": "Model activated successfully"
}
```

**Error Codes:**

| Code             | Status | Description                   |
| ---------------- | ------ | ----------------------------- |
| `NOT_FOUND`      | 404    | Model with given ID not found |
| `UNAUTHORIZED`   | 401    | Not authenticated             |
| `FORBIDDEN`      | 403    | Insufficient permissions      |
| `INTERNAL_ERROR` | 500    | Server error                  |

---

### Get Active Model

Retrieves the currently active authorization model.

**Endpoint:**

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

---

### Get Model by ID

Retrieves a specific authorization model by its ID.

**Endpoint:**

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

---

## Service Implementation

### AuthorizationService

**Location:** `services/auth-bff/src/admin/authorization/authorization.service.ts`

The AuthorizationService provides the business logic for authorization model management:

**Key Methods:**

| Method          | Description                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `createModel`   | Creates a new authorization model. Delegates to authorization-service (port 50055) via gRPC for full DSL validation. |
| `activateModel` | Switches the active authorization model to the specified version.                                                    |
| `validateModel` | Performs basic BFF-level validation only (empty check). Full DSL syntax parsing is handled by authorization-service. |

**Method Signatures:**

```typescript
// Create a new authorization model
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

// Activate an existing model
async activateModel(id: string): Promise<{
  success: boolean;
  message?: string;
}>;

// Validate model (basic check only)
async validateModel(dslSource: string): Promise<{
  valid: boolean;
  errors: string[];
}>;
```

---

## Related Documentation

- Main documentation: `auth-bff.md`

---

_This document is auto-generated from `docs/llm/services/auth-bff-api.md`_
