# Authorization API & Integration

> API design and NestJS guard usage for permission management

## Overview

This document describes the Authorization API design and integration patterns for implementing fine-grained access control using OpenFGA. It covers REST API endpoints, NestJS guard decorators, and infrastructure setup.

## API Endpoints

### Check Permission

Verify if a user has a specific permission on an object:

```typescript
// POST /api/admin/authorization/check
interface CheckRequest {
  user: string; // "user:alice"
  relation: string; // "can_view"
  object: string; // "session_recording:service-a"
}

interface CheckResponse {
  allowed: boolean;
  resolution_metadata?: {
    duration_in_ms: number;
  };
}
```

### Grant Permission

Grant a permission to a user:

```typescript
// POST /api/admin/authorization/grant
interface GrantRequest {
  user: string; // "user:alice"
  relation: string; // "can_view"
  object: string; // "session_recording:service-a"
  reason?: string; // Audit reason
  expiresAt?: string; // TTL (ISO 8601)
}

interface GrantResponse {
  success: boolean;
  tuple_key: {
    user: string;
    relation: string;
    object: string;
  };
}
```

### Revoke Permission

Revoke a permission from a user:

```typescript
// POST /api/admin/authorization/revoke
interface RevokeRequest {
  user: string;
  relation: string;
  object: string;
  reason?: string;
}
```

### Team Management

Create and manage permission groups:

```typescript
// POST /api/admin/teams
interface CreateTeamRequest {
  name: string; // "platform-team"
  displayName: string; // "Platform Team"
  serviceId?: string; // Optional service scope
  members: string[]; // ["user:alice", "user:bob"]
  permissions: Array<{
    relation: string; // "can_admin"
    object: string; // "session_recording:*"
  }>;
}

// GET /api/admin/teams/:name/members
// PUT /api/admin/teams/:name/members
// DELETE /api/admin/teams/:name
```

## NestJS Guard Integration

### Basic Usage

Use the `@FgaCheck` decorator to protect endpoints:

```typescript
import { FgaCheck } from '@my-girok/nest-common';

@Controller('sessions')
export class SessionsController {
  @Get()
  @FgaCheck({
    relation: 'can_view',
    objectType: 'session_recording',
    objectIdParam: 'serviceSlug',
  })
  async listSessions(@Query('serviceSlug') serviceSlug: string) {
    // Only executes if user has can_view on session_recording:{serviceSlug}
    return this.sessionsService.findByService(serviceSlug);
  }
}
```

### Dynamic Object Resolution

For more complex scenarios, use a resolver function:

```typescript
@Delete(':id')
@FgaCheck({
  relation: 'can_delete',
  objectResolver: async (context) => {
    const sessionId = context.getRequest().params.id;
    const session = await this.sessionsService.findById(sessionId);
    return `session_recording:${session.serviceSlug}`;
  },
})
async deleteSession(@Param('id') id: string) {
  return this.sessionsService.delete(id);
}
```

### Multiple Permission Checks

Check multiple permissions with AND/OR logic:

```typescript
@Post('bulk-delete')
@FgaCheck({
  checks: [
    { relation: 'can_delete', objectType: 'session_recording', objectIdParam: 'serviceSlug' },
    { relation: 'can_admin', objectType: 'service', objectIdParam: 'serviceSlug' },
  ],
  mode: 'any', // 'all' for AND, 'any' for OR
})
async bulkDelete(@Body() body: BulkDeleteDto) {
  // ...
}
```

## POC Rapid Setup

Quickly set up permissions for new features by cloning existing configurations:

```typescript
// Clone existing service permissions
await createServiceWithAuthorization({
  slug: 'poc-new-feature',
  features: ['session_recording', 'user_management'],
  copyFromService: 'service-a',
});
```

This creates:

- Service entity with standard roles (admin, member, viewer)
- Feature permissions inherited from the source service
- Default team assignments

## Infrastructure Setup

### Docker Compose

Local development setup:

```yaml
services:
  openfga:
    image: openfga/openfga:latest
    ports:
      - '8080:8080' # HTTP API
      - '8081:8081' # gRPC
    environment:
      - OPENFGA_DATASTORE_ENGINE=postgres
      - OPENFGA_DATASTORE_URI=postgres://postgres:password@postgres:5432/openfga
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: openfga
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
```

### Environment Variables

| Variable         | Description           | Example               |
| ---------------- | --------------------- | --------------------- |
| OPENFGA_API_URL  | OpenFGA HTTP endpoint | `http://openfga:8080` |
| OPENFGA_STORE_ID | Store identifier      | `01HQ...`             |
| OPENFGA_MODEL_ID | Model version         | `01HQ...` (optional)  |

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openfga
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: openfga
          image: openfga/openfga:v1.5.0
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
```

## Migration Strategy

| Phase | Description                  | Duration |
| ----- | ---------------------------- | -------- |
| 1     | Deploy OpenFGA, create model | Week 1   |
| 2     | Dual-write (DB + OpenFGA)    | Week 2-3 |
| 3     | Switch reads to OpenFGA      | Week 4   |
| 4     | Remove legacy tables         | Week 5+  |

### Phase 2: Dual-Write Pattern

```typescript
// During migration, write to both systems
async grantPermission(grant: GrantRequest) {
  // Write to legacy DB
  await this.legacyPermissionRepo.create(grant);

  // Write to OpenFGA
  await this.fgaClient.write({
    writes: [{ user: grant.user, relation: grant.relation, object: grant.object }],
  });
}
```

## Requirements Checklist

| Requirement               | Support | Implementation       |
| ------------------------- | ------- | -------------------- |
| Dynamic permission groups | Yes     | Team type            |
| Permission assignment     | Yes     | Tuple write          |
| Super user management     | Yes     | platform:super_admin |
| Service-scoped            | Yes     | service:{slug}       |
| POC rapid setup           | Yes     | Clone function       |
| Audit trail               | Yes     | PermissionAuditLog   |
| Time-limited access       | Yes     | TTL + background job |

## Error Handling

```typescript
// Common error responses
{
  "error": "FORBIDDEN",
  "message": "User does not have can_view permission on session_recording:service-a",
  "code": "FGA_CHECK_FAILED"
}

{
  "error": "NOT_FOUND",
  "message": "Store or model not found",
  "code": "FGA_STORE_ERROR"
}
```

## Related Documentation

- [OpenFGA Documentation](https://openfga.dev/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- Authorization Model: `docs/en/policies/authorization-model.md`
- Authorization Policy: `docs/en/policies/authorization.md`

---

_This document is auto-generated from `docs/llm/policies/authorization-api.md`_
