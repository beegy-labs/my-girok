# {Service} Service

> One-line description of the service purpose

## Service Information

| Property  | Value                          |
| --------- | ------------------------------ |
| REST Port | :{port}                        |
| gRPC Port | :{port} or N/A                 |
| Database  | {db_name} ({type})             |
| Cache     | Valkey DB {n}                  |
| Events    | `{prefix}.*` (Redpanda) or N/A |
| Codebase  | `services/{name}/`             |

## Domain Boundaries

| This Service Handles | NOT This Service (Route To) |
| -------------------- | --------------------------- |
| ...                  | ... (service-name)          |

## REST API

```
METHOD  /v1/endpoint
```

## gRPC Server (:{port})

> If no gRPC, replace with: `N/A - REST only`

| Method     | Description                 |
| ---------- | --------------------------- |
| MethodName | Description of what it does |

**Proto File**: `packages/proto/{service}/v1/{service}.proto`

## Database Tables

| Table      | Purpose                |
| ---------- | ---------------------- |
| table_name | What this table stores |

## Events

> If no events, replace with: `N/A`

```typescript
'EVENT_TYPE_1' | 'EVENT_TYPE_2';
```

## Caching

| Key Pattern          | TTL | Description    |
| -------------------- | --- | -------------- |
| `{service}:key:{id}` | 30m | What is cached |

## Environment Variables

```bash
PORT=
DATABASE_URL=
GRPC_PORT=
```

## Best Practices

- Always use @Transactional() for multi-step operations
- Validate all DTOs with class-validator
- Log all mutations to audit trail

---

**Full Documentation**: `docs/en/services/{SERVICE}_SERVICE.md`
