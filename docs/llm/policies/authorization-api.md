# Authorization API & Integration

> API design and NestJS guard usage

## API Design

### Check Permission

```typescript
// POST /api/admin/authorization/check
interface CheckRequest {
  user: string; // "user:alice"
  relation: string; // "can_view"
  object: string; // "session_recording:service-a"
}
```

### Grant/Revoke

```typescript
// POST /api/admin/authorization/grant
// POST /api/admin/authorization/revoke
interface GrantRequest {
  user: string;
  relation: string;
  object: string;
  reason?: string;
  expiresAt?: string; // TTL
}
```

### Team Management

```typescript
// POST /api/admin/teams
interface CreateTeamRequest {
  name: string;
  displayName: string;
  serviceId?: string;
  members: string[];
  permissions: Array<{
    relation: string;
    object: string;
  }>;
}
```

## NestJS Guard

```typescript
@FgaCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdParam: 'serviceSlug',
})
async listSessions(@Query('serviceSlug') serviceSlug: string) {
  // Only if user has can_view on session_recording:{serviceSlug}
}
```

## POC Rapid Setup

```typescript
// Clone existing service permissions
await createServiceWithAuthorization({
  slug: 'poc-new-feature',
  features: ['session_recording', 'user_management'],
  copyFromService: 'service-a',
});
```

## Infrastructure

### Docker Compose

```yaml
services:
  openfga:
    image: openfga/openfga:latest
    ports:
      - '8080:8080' # HTTP
      - '8081:8081' # gRPC
    environment:
      - OPENFGA_DATASTORE_ENGINE=postgres
      - OPENFGA_DATASTORE_URI=postgres://...
```

### Environment Variables

| Variable         | Description           |
| ---------------- | --------------------- |
| OPENFGA_API_URL  | OpenFGA HTTP endpoint |
| OPENFGA_STORE_ID | Store identifier      |

## Migration Strategy

| Phase | Description                  |
| ----- | ---------------------------- |
| 1     | Deploy OpenFGA, create model |
| 2     | Dual-write (DB + OpenFGA)    |
| 3     | Switch reads to OpenFGA      |
| 4     | Remove legacy tables         |

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

## References

- [OpenFGA Documentation](https://openfga.dev/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)

---

_Related: `authorization.md` | `authorization-model.md`_
